## 🧩 1️⃣ Docker Volumes & Mounts — The Foundation
- ### 1.1 What happens when you run:
```bash
docker run -v /host/path:/container/path ...
```
| Term              | Meaning                                    |
| ----------------- | ------------------------------------------ |
| `/host/path`      | Real directory or file on your host system |
| `/container/path` | Mount point inside the container           |


✅ Effect:
Everything inside /host/path becomes visible inside the container under /container/path.

📌 The container can read/write those files directly (depending on :ro / :rw).

### 🔹 1.2 Docker mount types

| Mount Type                             | Description                 | Lifetime                          |
| -------------------------------------- | --------------------------- | --------------------------------- |
| **bind mount** (`-v /tmp:/data`)       | Uses host directory or file | Exists as long as host dir exists |
| **named volume** (`-v vol_name:/data`) | Managed by Docker           | Persists after container dies     |
| **tmpfs mount**                        | Stored in RAM               | Deleted when container stops      |


### 🔹 1.3 Key point

The mounted path (/data) is not part of the container image — it’s attached dynamically at runtime.

If you inspect container filesystem layers:

- Image content → /bin, /usr, /etc, etc.

- Mounted content → Overlaid on top at runtime.

## 🧩 2️⃣ What happens inside the container
when you run:
```bash
docker run -v /home/anuroop/demo-dir:/data alpine
```
Inside the container:
```bash
/data → contents of host’s /home/anuroop/demo-dir
```

So if the host directory looks like:
```bash
/home/anuroop/demo-dir
├── file1.txt
└── notes/
```

then inside the container:
```bash
/data
├── file1.txt
└── notes/
```

🧠 Rule:

`You’re mounting the contents of that directory, not the directory path itself.`

So /data/home/anuroop/demo-dir ❌ (wrong)

Just /data ✅ (correct)

### 2.1 What if you mount host root /?
```bash
docker run -v /:/data:ro alpine
```
→ /data inside container shows your entire host filesystem (read-only).
Used only for debugging or system-level agents.

🧨 Dangerous without :ro — could modify your host OS.

## 🧩 3️⃣ WORKDIR and Mounting

- WORKDIR in Dockerfile just sets default working directory.

- It has no impact on mounting.

- Mounts are handled by the runtime, not by the Dockerfile.

Example:
```bash
FROM alpine
WORKDIR /data
```

- Even without WORKDIR, docker run -v /host:/data still works.

## 🧩 4️⃣ Inside Kubernetes — Mounts become Volumes
Kubernetes generalizes the concept of mounting through volumes.

A container doesn’t use -v; instead it uses:

- volumes: in pod spec (defines source)

- volumeMounts: (defines destination inside container)

Example:
```yaml
volumes:
- name: data-volume
  hostPath:
    path: /home/anuroop
    type: Directory
containers:
- name: app
  volumeMounts:
  - name: data-volume
    mountPath: /data
```

✅ Effect → `/home/anuroop` (on the node) is visible inside container `/data`

## 🧩 5️⃣ Why names match in `volumes` and `volumeMounts`

`volumeMounts[].name` refers to a `volumes[].name` entry.
That’s how Kubernetes connects them.
```yaml
volumes:
- name: my-vol     # defines source
containers:
- volumeMounts:
  - name: my-vol   # refers to same volume
    mountPath: /data
```

If names differ, the pod won’t start:
```bash
Error: volume "X" not found in volume list
```

🧩 6️⃣ What happens if mountPath doesn’t exist

✅ Kubernetes (via the container runtime) creates it automatically inside the container before the container starts.

Steps:

1. Container image prepared.

2. Runtime ensures /data exists.

3. Volume mounted onto /data.

For hostPath:

- Kubernetes checks the host’s /home/anuroop path.

- If type: DirectoryOrCreate → it creates it on the node.

- If type: Directory → pod fails if directory missing.


## 🧩 7️⃣ HostPath volumes — Node-local mounts

Example:
```yaml
volumes:
- name: host-vol
  hostPath:
    path: /home/anuroop
    type: DirectoryOrCreate
```

✅ Host’s `/home/anuroop` → Container’s `/data`.



📌 Characteristics:
| Behavior                           | HostPath                                     |
| ---------------------------------- | -------------------------------------------- |
| Data location                      | On that node’s local filesystem              |
| Survives pod restart?              | ✅ Yes                                        |
| Survives pod move to another node? | ❌ No                                         |
| Security                           | Access to node filesystem — use with caution |


Used for:

- Local testing

- Debugging

- Node-level agents

## 🧩 8️⃣ PersistentVolume (PV) & PersistentVolumeClaim (PVC)

PVCs abstract real storage.
They’re the Kubernetes-native way to get persistent data beyond a single node.

Relationship:
```bash
Pod → PVC → PV → Storage Backend
```
Example:

PersistentVolumeClaim:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

Deployment:
```yaml
volumes:
- name: data-vol
  persistentVolumeClaim:
    claimName: my-pvc
containers:
- volumeMounts:
  - name: data-vol
    mountPath: /data
```

✅ Result:

/data inside the container → external persistent storage (NFS, Ceph, EBS, etc.)


| Event                       | `emptyDir` | `hostPath`         | `PVC`                                 |
| --------------------------- | ---------- | ------------------ | ------------------------------------- |
| Pod restarts                | ❌ Lost     | ✅ Kept (same node) | ✅ Kept                                |
| Pod rescheduled to new node | ❌ Lost     | ❌ Lost             | ✅ Kept                                |
| Pod deleted                 | ❌ Lost     | ✅ Kept             | ✅ Kept                                |
| PVC deleted                 | N/A        | N/A                | ❌ Lost (depends on PV reclaim policy) |


🧩 🔹 10️⃣ Reclaim policy (decides what happens when PVC deleted)

Defined in PV:
```bash
persistentVolumeReclaimPolicy: Retain | Delete
```

| Policy   | Effect                                   |
| -------- | ---------------------------------------- |
| `Retain` | Keeps data even after PVC deletion       |
| `Delete` | Deletes storage backend when PVC deleted |



## 🧩 11️⃣ How PVCs actually attach

At runtime:

1. Scheduler selects a node.

2. Kubelet attaches the PV to that node (via NFS mount, EBS attach, Ceph, etc.).

3. Runtime mounts that volume into container’s /data.

When the pod dies:

- Container filesystem deleted.

- PV detached but not erased.

- New pod using same PVC → PV reattached → same data visible again.

## 🧩 12️⃣ Visual summary
```bash
Without PVC:
+-----------------------------------+
| Container (image + ephemeral FS)  |
|   /data -> emptyDir / hostPath    |
+-----------------------------------+

With PVC:
+-----------------------------------+
| Container                         |
|   /data -> PV mounted via PVC      |
|                                   |
+-----------------------------------+
       │
       ▼
  PVC (PersistentVolumeClaim)
       │
       ▼
  PV (PersistentVolume)
       │
       ▼
  Backend storage (NFS, EBS, Ceph, etc.)

```

## 🧩 13️⃣ Comparison Summary
| Feature     | Docker `-v`             | K8s `hostPath`        | K8s PVC + PV               |
| ----------- | ----------------------- | --------------------- | -------------------------- |
| Scope       | One container           | One node              | Cluster-wide               |
| Persistence | Until container deleted | Until node reboots    | Until PVC deleted          |
| Mobility    | ❌                       | ❌                     | ✅ (can move between nodes) |
| Security    | Direct host access      | Node-level access     | Controlled via PV backend  |
| Management  | Manual                  | Manual                | Automated by K8s           |
| Use case    | Local dev               | Node agents / testing | Production persistent data |


## 🧠 14️⃣ Key takeaways

✅ Volumes mounted into containers are never part of the image — they’re runtime overlays.
✅ hostPath volumes tie storage to one node.
✅ PVCs make storage portable and persistent across the cluster.
✅ Data in PVC lives beyond pod lifecycle — until PVC is deleted.
✅ Container runtimes create mount paths if missing.
✅ Always match volumeMount.name and volumes.name.
