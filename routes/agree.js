
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { SERVICE_APP_ADMIN_KEY, SECRET_KEY } = require('../config/constants');
const maria = require('../database/connect/maria');
const util = require('util');
const router = express.Router();

// Convert the callback-based maria.query to a promise-based function
const mariaQuery = util.promisify(maria.query).bind(maria);


router.post('/update', async (req, res) => {
  const userIdFromToken = req.user.user_id;

  try {
    var sql = "UPDATE kbow.users SET agree=1 WHERE user_id = ?";
    var result = await mariaQuery(sql, [userIdFromToken]);
    res.send(result);
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});


module.exports = router;
