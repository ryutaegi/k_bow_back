
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { SERVICE_APP_ADMIN_KEY, SECRET_KEY } = require('../../config/constants');
const maria = require('../../database/connect/maria');
const util = require('util');
const router = express.Router();

// Convert the callback-based maria.query to a promise-based function
const mariaQuery = util.promisify(maria.query).bind(maria);

router.get('/list', async (req, res) => {
  try {
    var sql = "SELECT group_id, group_name, group_description, is_password FROM kbow.group_info;";
    const result = await mariaQuery(sql);
    console.log(result);
    res.send(result);
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});

router.post('/join/public', async (req, res) => {
  const userIdFromToken = req.user.user_id;

  try {
    var sql = "SELECT COUNT(*) AS count FROM kbow.group_user WHERE user_id=? AND group_id=?";
    const insert_value = [userIdFromToken, req.body.group_id];
    let result = await mariaQuery(sql, insert_value);

    if (result[0].count != 0) {
      return res.status(409).json({ error: 'duplication error' });
    }

    sql = "INSERT INTO kbow.group_user (user_id, group_id) VALUE(?,?)";
    result = await mariaQuery(sql, insert_value);
    res.send(result);
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});

router.post('/join/private', async (req, res) => {
  const userIdFromToken = req.user.user_id;

  try {
    var sql = "SELECT COUNT(*) AS count FROM kbow.group_user WHERE user_id=? AND group_id=?";
    const checkValue = [userIdFromToken, req.body.group_id];
    let checkResult = await mariaQuery(sql, checkValue);

    if (checkResult[0].count != 0) {
      return res.status(409).json({ error: 'duplication error' });
    }


    try {
        var sql = "SELECT group_password FROM kbow.group_info WHERE group_id=?";
        const insert_value = [req.body.group_id]
        maria.query(sql, insert_value, (err, result) => {
            if (err) {
                console.log(err);
                return;
            }
		console.log(result[0]['group_password']);
		if(result[0]['group_password'] != req.body.group_password)
			res.status(401).json({ error : 'password error'});
        
        });
    } catch (error) {
        console.log('error', error);
        res.status(403).json({ error: 'db error' });
    }
    sql = "SELECT group_password FROM kbow.group_info WHERE group_id=?";
    const passwordValue = [req.body.group_id];
    let passwordResult = await mariaQuery(sql, passwordValue);

    if (passwordResult[0].group_password != req.body.group_password) {
      return res.status(401).json({ error: 'password error' });

    }

    sql = "INSERT INTO kbow.group_user (user_id, group_id) VALUE(?,?)";
    const insertValue = [userIdFromToken, req.body.group_id];
    let insertResult = await mariaQuery(sql, insertValue);
    res.send(insertResult);
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});

module.exports = router;
