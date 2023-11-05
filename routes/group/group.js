const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { SERVICE_APP_ADMIN_KEY, SECRET_KEY } = require('../../config/constants');
//const { getUserBySocialId, createUser } = require('../database/queries/userQueries');
const maria = require('../../database/connect/maria');
const router = express.Router();

router.get('/list', async (req, res) => {
  try {
      var sql = "SELECT group_id, group_name, group_description, is_password FROM kbow.group_info;";
      
      maria.query(sql, (err, result) => {
          if (err) {
              console.log(err);
              return;
          }
          console.log(result);
          res.send(result);
      });
  } catch (error) {
      console.log('error', error);
      res.status(403).json({ error: 'db error' });
  }
});

router.post('/join', async (req, res) => {
    const userIdFromToken = req.user.user_id; 
    try {
        var sql = "INSERT INTO kbow.group_user (user_id, group_id) VALUE(?,?)";
        const insert_value = [userIdFromToken, req.body.group_id]
        maria.query(sql, insert_value, (err, result) => {
            if (err) {
                console.log(err);
                return;
            }
            console.log(result);
            res.send(result);
        });
    } catch (error) {
        console.log('error', error);
        res.status(403).json({ error: 'db error' });
    }
  });





module.exports = router;
