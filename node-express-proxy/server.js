'use strict';

const bodyParser = require('body-parser');
const chalk = require('chalk');
const express = require('express');
const http = require('http');
const lessMiddleware = require('less-middleware');
const path = require('path');

const config = require('./config');
const { PORT, WEBSITE1, WEBSITE2 } = config;

// Express set up
const app = express();
app.set('port', PORT);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(lessMiddleware(path.join(__dirname, 'public')));

// Serve public from this path so its route doesn't conflict with proxied requests
app.use('/code-collider/public', express.static('public'));

// Routes
const homeRoute = require('./routes/home.route');
// const proxyRoute = require('./routes/proxy.route1');
const proxyRoute = require('./routes/proxy.route2');
app.use('/code-collider', homeRoute);
app.use('/', proxyRoute);

// Start server
const server = http.createServer(app);
server.listen(PORT);
server.on('listening', () => {
  const protocol = 'http';
  const hostname = 'localhost';

  console.log(`
    Injecting:
      ${chalk.yellow(WEBSITE2)} -> ${chalk.yellow(WEBSITE1)}
    Open your browser to:
      ${chalk.yellow(protocol + '://' + hostname + ':' + PORT)}
  `);
});
