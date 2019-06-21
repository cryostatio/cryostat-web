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

app.get('/grafana/upload', (req, res) => {
  console.log('GET /grafana/upload');
  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({
      uploadUrl: `http://${process.argv.slice(2)[0]}:${port}/upload`
    }));
});

app.get('/grafana/load', (req, res) => {
  console.log('GET /grafana/load');
  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({
      loadUrl: `http://${process.argv.slice(2)[0]}:${port}/load`
    }));
});

app.post('/upload', (req, res) => {
  console.log('POST /upload');
  res
    .status(200)
    .type('text/plain')
    .header('Access-Control-Allow-Origin', '*')
    .send('Uploaded: file-uploads/9a521eaf-cfdb-4c12-9a17-863acd4f8871');
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
