const path = require('path');
module.exports = {
  stylePaths: [
    path.resolve(__dirname, 'src'),
    path.resolve(__dirname, 'node_modules/patternfly'),
    path.resolve(__dirname, 'node_modules/@patternfly/patternfly'),
    path.resolve(__dirname, 'node_modules/@patternfly/react-styles/css'),
    path.resolve(__dirname, 'node_modules/@patternfly/react-core/dist/styles/base.css'),
    path.resolve(__dirname, 'node_modules/@patternfly/react-core/dist/esm/@patternfly/patternfly'),
    path.resolve(__dirname, 'node_modules/@patternfly/react-core/node_modules/@patternfly/react-styles/css'),
    path.resolve(__dirname, 'node_modules/@patternfly/react-table/node_modules/@patternfly/react-styles/css'),
    path.resolve(__dirname, 'node_modules/@patternfly/quickstarts/dist/quickstarts.css'),
    path.resolve(__dirname, 'node_modules/@patternfly/react-topology/dist/esm/css'),
    path.resolve(__dirname, "node_modules/@patternfly/react-topology/node_modules/@patternfly/react-styles/css"),
    path.resolve(__dirname, "node_modules/@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css"),
    path.resolve(__dirname, "node_modules/@patternfly/react-catalog-view-extension/node_modules/@patternfly/react-styles/css"),
    path.resolve(__dirname, 'node_modules/@patternfly/quickstarts/dist/quickstarts.min.css'),
  ]
}
