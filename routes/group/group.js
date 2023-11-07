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

router.post('/join/public', async (req, res) => {
    const userIdFromToken = req.user.user_id; 

    try {
        var sql = "SELECT COUNT(*) FROM kbow.group_user WHERE user_id=? AND group_id=?";
        const insert_value = [userIdFromToken, req.body.group_id]
        maria.query(sql, insert_value, (err, result) => {
            if (err) {
                console.log(err);
                return;
            }
		if(result[0]['COUNT(*)'] != 0)
			res.status(409).json({ error : 'duplication error'});
            console.log(result[0]['COUNT(*)']);
        
        });
    } catch (error) {
        console.log('error', error);
        res.status(403).json({ error: 'db error' });
    }

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

  router.post('/join/private', async (req, res) => {
    const userIdFromToken = req.user.user_id; 

    try {
        var sql = "SELECT COUNT(*) FROM kbow.group_user WHERE user_id=? AND group_id=?";
        const insert_value = [userIdFromToken, req.body.group_id]
        maria.query(sql, insert_value, (err, result) => {
            if (err) {
                console.log(err);
                return;
            }
		if(result[0]['COUNT(*)'] != 0)
			res.status(409).json({ error : 'duplication error'});
            console.log(result[0]['COUNT(*)']);
        
        });
    } catch (error) {
        console.log('error', error);
        res.status(403).json({ error: 'db error' });
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
