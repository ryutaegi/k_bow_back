const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
//const { getUserBySocialId, createUser } = require('../database/queries/userQueries');
const maria = require('../database/connect/maria');
const router = express.Router();

router.post('/login', async (req, res) => {
    const tokens = req.body.token;
    console.log(tokens);
    
    try {
      const response = await axios.get('https://openapi.naver.com/v1/nid/me', {
        headers: {
          Authorization: `Bearer ${tokens}`,
        }
      });
      console.log("response", response.data.response);

      var sql = "SELECT * FROM kbow.users WHERE social_type = 2 AND social_id = ?;";

      // maria.query를 Promise로 감싸기
      const result = await new Promise((resolve, reject) => {
          maria.query(sql, response.data.response.id, (err, result) => {
              if (err) {
                  return reject(err);
              }
              resolve(result);
          });
      });

      let jwtToken;
      if (result.length === 0) {
          // 회원가입 처리와 JWT 발급
          sql = "INSERT INTO kbow.users(social_id, social_type, nickname, social_email, age_group, gender, image_url, agree) VALUES(?,?,?,?,?,?,?,?)";
          let insert_values = [response.data.response.id, 2, response.data.response.name, null, response.data.response.age | null, response.data.response.gender | null, response.data.profile_image | null, 0];
          
          const insertResult = await new Promise((resolve, reject) => {
              maria.query(sql, insert_values, (err, result) => {
                  if (err) {
                      return reject(err);
                  }
                  resolve(result);
              });
          });

          jwtToken = jwt.sign({
              social_id : response.data.response.id,
              social_type : 2,
              user_id : insertResult.insertId,
              image_url: response.data.response.profile_image,
              nickname: response.data.response.name,
              agree : 0,
          }, process.env.SECRET_KEY, {
              expiresIn: '3h'
          });

          console.log("jwt is", jwtToken);
          return res.json({ isNewUser: true, token: jwtToken });
      } else {
          // 로그인 처리와 JWT 발급
          jwtToken = jwt.sign({
              social_id : response.data.response.id,
              social_type : 2,
              user_id : result[0].user_id,
              image_url: response.data.response.profile_image,
              nickname: response.data.response.name,
              agree : result[0].agree
          }, process.env.SECRET_KEY, {
              expiresIn: '3h'
          });

          console.log("jwt is", jwtToken);
          return res.json({ isNewUser: false, token: jwtToken });
      }
    } catch (error) {
      console.log('error', error);
      res.status(400).json({ error: 'Error fetching user data from Kakao' });
    }
});

module.exports = router;
