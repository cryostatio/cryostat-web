# Container-JFR-Web

Web front-end for container-jfr, providing a graphical user interface for managing JFR on remote JVMs

## Development server

Run a `container-jfr` instance with WebSocket communication enabled, listening on port 9090. For example,

`docker run --name container-jfr --hostname container-jfr -d --rm -p 9090:9090 -p 9091:9091 quay.io/rh-jmc-team/container-jfr`

will run a suitable instance using Docker.

Then, run the `mockapi.server.js` in this project using Node, ie `node mockapi.server.js &`

Finally, run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

A Docker image can be produced with ex. `docker build -t container-jfr-web .` . The URL used for automatic connection to the

background `container-jfr` instance can be configured at Docker container startup time by setting the environment variable

`CONTAINER_JFR_URL` to the desired URL (be sure to include any paths if required, and that the protocol is `ws://`). Additionally,

upload of Flight Recordings to a Grafana jfr-datasource can be enabled in the Archived recordings component by setting the environment

variable `GRAFANA_DATASOURCE_URL`, set to the base URL of the jfr-datasource instance (including `http(s)://`). If this is set then

the corresponding `GRAFANA_DASHBOARD_URL` environment variable should be set, which points to the location of a Grafana instance to which

the datasource is attached.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

# REACT

Patternfly Seed is an open source build scaffolding utility for web apps. The primary purpose of this project is to give developers a jump start when creating new projects that will use patternfly. A secondary purpose of this project is to serve as a reference for how to configure various aspects of an application that uses patternfly, webpack, react, typescript, etc.

Out of the box you'll get an app layout with chrome (header/sidebar), routing, build pipeline, test suite, and some code quality tools. Basically, all the essentials.

<img width="1058" alt="Out of box dashboard view of patternfly seed" src="https://user-images.githubusercontent.com/5942899/62715686-fa954980-b9ce-11e9-9fc2-217b7a4d1d81.png">

## Quick-start
```bash
git clone https://github.com/patternfly/patternfly-react-seed # clone the project
cd patternfly-react-seed # navigate into the project directory
npm install # install patternfly-react-seed dependencies
npm run start # start the development server
```
## Development Scripts

Install development/build dependencies
`npm install`

Start the development server
`npm run start:dev`

Run a production build
`npm run build`

Run the test suite
`npm run test`

Run the linter
`npm run lint`

Run the code formatter
`npm run format`

Launch a tool to inspect the bundle size
`npm run bundle-profile:analyze`

Start the express server (run a production build first)
`npm run start`

## Configurations
* [TypeScript Config](./tsconfig.json)
* [Webpack Config](./webpack.common.js)
* [Jest Config](./jest.config.js)
* [Editor Config](./.editorconfig)

## Raster Image Support

To use an image asset that's shipped with patternfly core, you'll prefix the paths with "@assets". `@assets` is an alias for the patternfly assets directory in node_modules.

For example:
```js
import imgSrc from '@assets/images/g_sizing.png';
<img src={imgSrc} alt="Some image" />
```

You can use a similar technique to import assets from your local app, just prefix the paths with "@app". `@app` is an alias for the main src/app directory.

```js
import loader from '@app/assets/images/loader.gif';
<img src={loader} alt="Content loading />
```

## Vector Image Support
Inlining SVG in the app's markup is also possible.

```js
import logo from '@app/assets/images/logo.svg';
<span dangerouslySetInnerHTML={{__html: logo}} />
```

You can also use SVG when applying background images with CSS. To do this, your SVG's must live under a `bgimages` directory (this directory name is configurable in [webpack.common.js](./webpack.common.js#L5)). This is necessary because you may need to use SVG's in several other context (inline images, fonts, icons, etc.) and so we need to be able to differentiate between these usages so the appropriate loader is invoked.
```css
body {
  background: url(./assets/bgimages/img_avatar.svg);
}
```

## Code Quality Tools
* For accessibility compliance, we use [react-axe](https://github.com/dequelabs/react-axe)
* To keep our bundle size in check, we use [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
* To keep our code formatting in check, we use [prettier](https://github.com/prettier/prettier)
* To keep our code logic and test coverage in check, we use [jest](https://github.com/facebook/jest)
* To ensure code styles remain consistent, we use [eslint](https://eslint.org/)
