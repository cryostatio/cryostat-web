const express = require('express');
const app = express();
const port = 9999;

app.use(function (req, res, next) {
    console.info(`${req.method} ${req.originalUrl}`);
    next();
});

app.get('/clienturl', (req, res) => {
  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({
      clientUrl: process.env.CONTAINER_JFR_URL
    }));
});

app.get('/grafana_datasource_url', (req, res) => {
  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({
      grafanaDatasourceUrl: process.env.GRAFANA_DATASOURCE_URL
    }));
});

app.get('/grafana_dashboard_url', (req, res) => {
  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({
      grafanaDashboardUrl: process.env.GRAFANA_DASHBOARD_URL
    }));
});

app.post('/load', (req, res) => {
  res
    .status(200)
    .type('text/plain')
    .header('Access-Control-Allow-Origin', '*')
    .send('Updated selection');
});

app.listen(port, () => {
  console.log(`MockAPI server listening on port ${port}`);
});
