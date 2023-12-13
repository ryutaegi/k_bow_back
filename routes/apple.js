const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const maria = require('../database/connect/maria');
const router = express.Router();
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys'
});

function getKey(header, callback){
  client.getSigningKey(header.kid, function(err, key) {
    var signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

router.post('/login', async (req, res) => {
  const token = req.body.token;
  const nickname = req.body.nickname;

  try {
    const decoded = await verifyToken(token);
    console.log(decoded);

    const sql = "SELECT * FROM kbow.users WHERE social_type = 3 AND social_id = ?;";
    const result = await new Promise((resolve, reject) => {
      maria.query(sql, [decoded.sub], (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });

    let jwtToken;
    if (result.length === 0) {
      // 회원가입 처리와 JWT 발급
      const insertSql = "INSERT INTO kbow.users(social_id, social_type, nickname, social_email, age_group, gender, image_url, agree) VALUES(?,?,?,?,?,?,?,?)";
      const insertValues = [decoded.sub, 3, nickname || decoded.email, decoded.email, null, null, null, 0];
      const insertResult = await new Promise((resolve, reject) => {
        maria.query(insertSql, insertValues, (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result);
        });
      });

      jwtToken = jwt.sign({
        social_id: decoded.sub,
        social_type: 3,
        user_id: insertResult.insertId,
        nickname: nickname || decoded.email,
        agree: 0
      }, process.env.SECRET_KEY, {
        expiresIn: '7d'
      });

      return res.json({ isNewUser: true, token: jwtToken });
    } else {
      // 로그인 처리와 JWT 발급
      jwtToken = jwt.sign({
        social_id: decoded.sub,
        social_type: 3,
        user_id: result[0].user_id,
        nickname: result[0].nickname,
        agree: result[0].agree
      }, process.env.SECRET_KEY, {
        expiresIn: '7d'
      });

      return res.json({ isNewUser: false, token: jwtToken });
    }

  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(400).json({
      status: 'error',
      message: 'Authentication failed',
      detail: error.message
    });
  }
});

module.exports = router;
