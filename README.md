# Container-JFR-Web

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 7.3.8.

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
