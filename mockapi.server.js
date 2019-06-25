const express = require('express');
const app = express();
const port = 9999;

app.get('/clienturl', (req, res) => {
  console.log('GET /clienturl');
  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({
      clientUrl: 'ws://localhost:9090/command'
    }));
});

app.get('/grafanaurl', (req, res) => {
  console.log('GET /grafanaurl');
  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({
      grafanaUrl: `http://${process.argv.slice(2)[0]}:${port}`
    }));
});

app.post('/load', (req, res) => {
  console.log('POST /load');
  res
    .status(200)
    .type('text/plain')
    .header('Access-Control-Allow-Origin', '*')
    .send('Updated selection');
});

app.listen(port, () => {
  console.log(`MockAPI server listening on port ${port}`);
});
