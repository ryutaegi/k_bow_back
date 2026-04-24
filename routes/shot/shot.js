const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { SERVICE_APP_ADMIN_KEY, SECRET_KEY } = require('../../config/constants');
//const { getUserBySocialId, createUser } = require('../database/queries/userQueries');
const maria = require('../../database/connect/maria');
const router = express.Router();

router.post('/save', async (req, res) => {
  try {
          var sql = "INSERT INTO kbow.shots(user_id, shot_date, shot_array, feedback, shot_count, target_count) VALUES(?,?,?,?,?,?)";
          let insert_value = [req.user.user_id, req.body.date, req.body.shot, req.body.feedback, req.body.shot_count, req.body.target_count];

          maria.query(sql, insert_value, (err, result) => {
            if (err) {
              console.log(err);
              res.status(500).json({ error: 'Database Error' });
              return;
            }
            res.send(insert_value);
      });
  } catch (error) {
      console.log('error', error);
      res.status(403).json({ error: 'db error' });
  }
});

router.post('/month', async (req, res) => {
  try {
    var sql = "SELECT *, CONVERT_TZ(shot_date, 'UTC', 'Asia/Seoul') AS shot_date_korean FROM kbow.shots WHERE user_id = ? AND DATE_FORMAT(shot_date, '%Y-%m')=?;";
    let insert_value = [req.user.user_id, req.body.month]; 

    maria.query(sql, insert_value, (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: 'Database query error' });
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

router.post('/detail', async (req, res) => {
  try {
    var sql = "SELECT * FROM kbow.shots WHERE user_id = ? AND shot_date LIKE ?;";
    let insert_value = [req.user.user_id, req.body.date]; 
	console.log(insert_value);
    maria.query(sql, insert_value, (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: 'Database query error' });
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

router.post('/modify', async (req, res) => {
	try {
	var sql = "UPDATE kbow.shots SET shot_array = ?, feedback = ?, shot_count = ?, target_count = ? WHERE user_id = ? AND shot_date = ?";
    let insert_value = [req.body.shots, req.body.feedback, req.body.shot_count, req.body.target_count, req.user.user_id, req.body.date];
        console.log(insert_value);
    maria.query(sql, insert_value, (err, result) => {
	          if (err) {
			          console.log(err);
			          res.status(500).json({ error: 'Database query error' });
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
