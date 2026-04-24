const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const maria = require('../database/connect/maria');
const router = express.Router();
const axios = require('axios');

router.post('/login', async (req, res) => {
  const { token } = req.body;

  try {
    // Google ID 토큰 검증
    const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const { sub, email, name, picture } = googleRes.data;

    const sql = "SELECT * FROM kbow.users WHERE social_type = 4 AND social_id = ?;";
    const result = await new Promise((resolve, reject) => {
      maria.query(sql, [sub], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let jwtToken;
    if (result.length === 0) {
      const insertSql = "INSERT INTO kbow.users(social_id, social_type, nickname, social_email, age_group, gender, image_url, agree) VALUES(?,?,?,?,?,?,?,?)";
      const insertValues = [sub, 4, name || email, email, null, null, picture || null, 0];
      const insertResult = await new Promise((resolve, reject) => {
        maria.query(insertSql, insertValues, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      jwtToken = jwt.sign({
        social_id: sub,
        social_type: 4,
        user_id: insertResult.insertId,
        nickname: name || email,
        agree: 0
      }, process.env.SECRET_KEY, { expiresIn: '7d' });

      return res.json({ isNewUser: true, token: jwtToken });
    } else {
      jwtToken = jwt.sign({
        social_id: sub,
        social_type: 4,
        user_id: result[0].user_id,
        nickname: result[0].nickname,
        agree: result[0].agree
      }, process.env.SECRET_KEY, { expiresIn: '7d' });

      return res.json({ isNewUser: false, token: jwtToken });
    }

  } catch (error) {
    console.error('Google 로그인 오류:', error);
    res.status(400).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }
});

module.exports = router;
