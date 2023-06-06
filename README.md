# cryostat-web

![Build Status](https://github.com/cryostatio/cryostat-web/actions/workflows/ci.yaml/badge.svg)
[![Google Group : Cryostat Development](https://img.shields.io/badge/Google%20Group-Cryostat%20Development-blue.svg)](https://groups.google.com/g/cryostat-development)

Web front-end for [Cryostat](https://github.com/cryostatio/cryostat), providing a graphical user interface for managing JFR on remote JVMs.

Based on [Patternfly React Seed](https://github.com/patternfly/patternfly-react-seed).

## SEE ALSO

* [cryostat-core](https://github.com/cryostatio/cryostat-core) for
the core library providing a convenience wrapper and headless stubs for use of
JFR using JDK Mission Control internals.

* [cryostat-operator](https://github.com/cryostatio/cryostat-operator)
for an OpenShift Operator facilitating easy setup of Cryostat in your OpenShift
cluster as well as exposing the Cryostat API as Kubernetes Custom Resources.

* [cryostat](https://github.com/cryostatio/cryostat) for the JFR management service

## REQUIREMENTS

- Node v16+
- Yarn v3.3.0+

## BUILD

### Setup dependencies

```bash
$ yarn install --immutable
```

### Run a production build

```bash
$ yarn build
# or without tests
$ yarn build:notests
```

## DEVELOPMENT SERVER

Development environment supports hot reload with Webpack's [Hot Module Replacement](https://webpack.js.org/guides/hot-module-replacement).

### With Cryostat

First, launch a [`Cryostat`](https://github.com/cryostatio/cryostat) instance with CORS enabled by setting `CRYOSTAT_CORS_ORIGIN` to `http://localhost:9000`. For example:

```bash
$ cd /path/to/cryostat
$ CRYOSTAT_DISABLE_SSL=true CRYOSTAT_CORS_ORIGIN=http://localhost:9000 sh run.sh
```

Then, run:

```bash
$ yarn start:dev
```

### Without Cryostat

To quickly preview changes without launching a `Cryostat` instance, run:

```bash
$ yarn start:dev:preview
```

In this case, API requests are intercepted and handled by [Mirage JS](https://miragejs.com/).

## TEST

### Run the unit tests
```
$ yarn test
```

Refer to [TESTING.md](TESTING.md) for more details about tests.

### Run the linter

```bash
$ yarn eslint:apply
```

### Run the code formatter

```bash
$ yarn format:apply
```

### Inspect the bundle size

```
$ yarn bundle-profile:analyze
```

## LOCALIZATION

To generate translation entries for texts in the app, run:

```
yarn localize
```

The extraction tool is [`i18next-parser`](https://www.npmjs.com/package/i18next-parser), which statically finds and exports translation entries, meaning `i18next-parser` does not run code and requires explicit values. See more [details](https://github.com/i18next/i18next-parser#caveats
).

To workaround this, specify static values in `i18n.ts` file under any top-level directory below `src/app`. For example, `src/app/Settings/i18n.ts`.
