const express = require('express');
const app = express();
const port = 9999;

app.get('/clienturl', (req, res) => {
  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({
      clientUrl: 'ws://localhost:9090/command'
    }));
});

app.listen(port, () => {
  console.log(`MockAPI server listening on port ${port}`);
});
