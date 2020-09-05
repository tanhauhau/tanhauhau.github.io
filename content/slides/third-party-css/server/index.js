const fs = require('fs');
const https = require('https');
const http = require('http');

const express = require('express');
const app = express();

const privateKey = fs.readFileSync('gstatic.com-key.pem', 'utf8');
const certificate = fs.readFileSync('gstatic.com.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);
const httpServer = http.createServer(app);

app.use(express.static('static'));
app.use((req, res) => {
  console.log(req.path, req.query);
  res.status(400).send(`Request: ${req.path}, ${JSON.stringify(req.query)}`);
});

httpServer.listen(80);
httpsServer.listen(443);
