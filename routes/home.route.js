'use strict';

const express = require('express');
const router = express.Router();

const config = require('../config');
const { WEBSITE1, WEBSITE2 } = config;

router.get('/', (req, res) => {
  const title = 'Code Collider v2';
  res.render('home', { title, WEBSITE1, WEBSITE2 });
});

module.exports = router;
