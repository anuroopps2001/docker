const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Defensive global handlers to avoid process exit on unexpected errors
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  ssl:
    process.env.NODE_ENV !== 'production'
      ? false
      : { rejectUnauthorized: false },
});

pgClient.on('connect', (client) => {
  client
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.error('Error creating values table:', err));
});

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  try {
    const values = await pgClient.query('SELECT * from values');
    res.send(values.rows);
  } catch (err) {
    console.error('Error fetching values from Postgres:', err);
    res.status(500).json({ error: 'database error' });
  }
});

app.get('/values/current', async (req, res) => {
  try {
    redisClient.hgetall('values', (err, values) => {
      if (err) {
        console.error('Redis hgetall error:', err);
        return res.status(500).json({ error: 'redis error' });
      }
      res.send(values || {});
    });
  } catch (err) {
    console.error('Unexpected error in /values/current:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.post('/values', async (req, res) => {
  try {
    const raw = req.body && req.body.index;

    // 1) presence check
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return res.status(400).json({ error: 'index required' });
    }

    // 2) integer parsing and validation
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      return res.status(400).json({ error: 'index must be an integer' });
    }

    // 3) enforce limit (same rule you had)
    if (n > 40) {
      return res.status(422).send('Index too high');
    }

    // 4) write to redis (non-blocking, but log errors)
    redisClient.hset('values', n, 'Nothing yet!', (err) => {
      if (err) console.error('Redis hset error:', err);
    });

    // 5) publish event
    redisPublisher.publish('insert', String(n));

    // 6) safe DB insert (await and catch DB errors)
    try {
      await pgClient.query('INSERT INTO values(number) VALUES($1)', [n]);
    } catch (dbErr) {
      console.error('Postgres insert error:', dbErr);
      // If DB insert fails, return 500 but do not crash the process
      return res.status(500).json({ error: 'database error' });
    }

    return res.status(201).json({ working: true });
  } catch (err) {
    console.error('Unexpected error in POST /values:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

app.listen(5000, (err) => {
  if (err) {
    console.error('Server listen error:', err);
    process.exit(1);
  }
  console.log('Listening');
});

