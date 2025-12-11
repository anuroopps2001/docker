# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

### DOCKER VOLUMES

**We earlier saw that, whenever we build the image and start container and then modify the source code again, those changes are not reflected into the running container and to make it reflect inside the running container, we make use of "DOCKER VOLUMES"**


```bash
$ docker run -p 3000:3000 -v $(pwd):/app <imageID>
```
it will map, "pwd" content into "/app" dir inside the container

But for nodejs application to run, we need node_modules dir where are the dependencies downloaded were present and we deleted the copy that was present on host machine and it;s only present inside the container.


However, when we use -v to map host filesystem into container, the container filesystem got overwritten and now node_modules dir is not available in the container as well.

In order to solve this proble, we need to map the node_module dir of container again and now the updated command will be 

```bash
$ docker run -p 3000:3000 -v /app/node_modules -v $(pwd):/app <imageID>
```

```bash
$ docker build -f Dockerfile.dev .
$ docker run -it <image_id> npm run test  # to execute the tests inside the container
```

To run automatic tests inside the container, once tests on modified inside the test files present on the host system, we need to:


```
$ docker-compose up

$ docker exec -it <container_ID_from_above_step> npm run test  # reuse the existing container
```

But this is a hectic process and not recommended.

 and that's why, we add one more server into the docker-compose yaml and execute the tests from that container.


#### For production setups, we need to have the images with minimal dependencies and that's why production nodejs application, we will make use of "MULTI-STAGE DOCKER BUILDS"

In first stage, we use nodejs base image and install all the dependencies and packages required to run the application.

And in second stage, we will use nginx base image to only forward the requests and reponses between clients and server respectively and will copy only build files generated in the first stage.

***NGINX is mostly used for serving web pages in production environments***



## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
