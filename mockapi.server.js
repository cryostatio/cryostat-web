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

app.get('/uploadurl', (req, res) => {
  console.log('GET /uploadurl');
  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({
      uploadUrl: `http://localhost:${port}/upload`
    }));
});

app.post('/upload', (req, res) => {
  console.log('POST /upload');
  res
    .status(200)
    .send('OK');
});

app.listen(port, () => {
  console.log(`MockAPI server listening on port ${port}`);
});
