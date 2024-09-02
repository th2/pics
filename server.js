const express = require('express');
const app = express();
const http = require('http').createServer(app);
const logger = require('./logger.js');
const path = require('path');
const imagedb = require('./imagedb.js');

app.use(logger.visitReq());

app.get('/thumbs/*', (req, res) => {
    imagedb.getThumb(req.url, res);
});

app.get('/images/*', (req, res) => {
    imagedb.getImage(req.url, res);
});

app.use((req, res) => {
    res.sendStatus(404);
});

app.use(logger.errorReq());

http.listen(process.env.PORT, () => console.log(`listening on port ${process.env.PORT}`));
