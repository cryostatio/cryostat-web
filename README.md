# cryostat-web

[![CI](https://github.com/cryostatio/cryostat-web/actions/workflows/ci.yaml/badge.svg)](https://github.com/cryostatio/cryostat-web/actions/workflows/ci.yaml)
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

* [cryostat](https://github.com/cryostatio/cryostat) for the JFR management service.

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
```bash
$ yarn test
```

### Run the integration tests
```bash
$ yarn itest:preview
```

Refer to [TESTING.md](TESTING.md) for more details about tests.

### Run the linter
[ESLint](https://eslint.org/) is a linter that checks for code quality and style. Configuration can be found in `.eslintrc`.

The `ESLint` job runs on every pull request, and will fail if there are any ESLint errors. Warnings will not fail the job.

To fix this, run:
```bash
$ yarn eslint:apply
```
You can also run `yarn eslint:check` to see if there are any ESLint issues without applying the fixes.

To run a development server with ESLint enabled in hot-reload mode, run:
```bash
$ yarn start:dev:lint
```

With this command, ESLint will run on every file change, and will show ESLint errors/warnings in the terminal.

### Run the code formatter

Prettier is a code formatter that makes sure that all code is formatted the same way. Configuration can be found in `.prettierrc`. There is a `prettierignore` file that tells Prettier to ignore certain files. 

The license header checking job makes sure that all files have the correct license header. The npm package can be found [here](https://www.npmjs.com/package/license-check-and-add). The license header can be found in `LICENSE`. The `license-check-and-add` configuration can be found in `license-config.json`.

The `Format` job runs on every pull request, and will fail if the code is not formatted correctly, or if some licenses have not been added to some files. 

To fix this, format the code:
```bash
$ yarn format:apply
``` 
You can also run `yarn format:check` to see if there are any formatting issues without applying the formatting.

### Inspect the bundle size

```bash
$ yarn bundle-profile:analyze
```

## LOCALIZATION

To generate translation entries for texts in the app, run:

```bash
$ yarn localize
```

The extraction tool is [`i18next-parser`](https://www.npmjs.com/package/i18next-parser), which statically finds and exports translation entries, meaning `i18next-parser` does not run code and requires explicit values. See more [details](https://github.com/i18next/i18next-parser#caveats
).

To workaround this, specify static values in `i18n.ts` file under any top-level directory below `src/app`. For example, `src/app/Settings/i18n.ts`.

Refer to [LOCALIZATION.md](LOCALIZATION.md) for more details about our localization framework.

## CONTRIBUTING

### Code consistency

- `[*].types.ts(x)`: Define type definitions, including types and enums.
- `[*].utils.ts(x)`: Define utility functions. These might contain constants (usually tightly coupled with the utility functions).
- `[*].const.ts`: Define constants. These constants are purely for UI rendering.
- `[*].context.tsx`: Define React contexts. These can be defined in util files.

### Code contribution

See [CONTRIBUTING.md](https://github.com/cryostatio/cryostat/blob/main/CONTRIBUTING.md).
