const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
//const { getUserBySocialId, createUser } = require('../database/queries/userQueries');
const maria = require('../database/connect/maria');
const router = express.Router();

router.post('/login', async (req, res) => {
    const token = req.body.token;
    console.log(token);
    
    try {
      const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      
      });
   
      var sql = "SELECT * FROM kbow.users WHERE social_type = 1 AND social_id = ?;";
      maria.query(sql, response.data.id, (err, result) => {
        if (err) {
          console.log(err);
          return;
        }
        
        let jwtToken;
        if (result.length === 0) { //회원가입 처리
          //console.log("여기", result.length);
          sql = "INSERT INTO kbow.users(social_id, social_type, nickname, social_email, age_group, gender, image_url) VALUES(?,?,?,?,?,?,?)";
          let insert_value = [response.data.id, 1, response.data.kakao_account.profile.nickname, response.data.kakao_account.email, response.data.kakao_account.age_range | null, response.data.kakao_account.gender | null, response.data.kakao_account.profile.profile_image_url | null];
          //console.log("테스트", insert_value);
          maria.query(sql, insert_value, (err, result) => {
            if (err) {
              console.log(err);
              return;
            }
            //console.log("회원가입 성공", insert_value)
          });
  
          // 여기에서 JWT를 발급
          jwtToken = jwt.sign({
            social_id : response.data.id,
            social_type : 1,
            user_id : result[0].user_id,
            image_url: response.data.kakao_account.profile.profile_image_url,
            nickname: response.data.kakao_account.profile.nickname
          }, process.env.SECRET_KEY, {
            expiresIn: '1h'
          });
          res.json({ isNewUser: true, token: jwtToken });
        }
        else { //로그인 처리
          console.log("로그인 처리");
          // 로그인 처리시 JWT를 발급
          jwtToken = jwt.sign({
            social_id : response.data.id,
            social_type : 1,
            user_id : result[0].user_id,
            image_url: response.data.kakao_account.profile.profile_image_url,
            nickname: response.data.kakao_account.profile.nickname
          }, process.env.SECRET_KEY, {
            expiresIn: '1h'
          });
          res.json({ isNewUser: false, token: jwtToken });
        }
      });
  
    } catch (error) {
      console.log('error', error);
      res.status(400).json({ error: 'Error fetching user data from Kakao' });
    }
});

router.post('/logout', async (req, res) => {
    console.log(req.body);
    const formUrlEncoded = (x) =>
    Object.keys(x).reduce((p, c) => p + `&${c}=${encodeURIComponent(x[c])}`, "");
    try {
      const response = await axios.post('https://kapi.kakao.com/v1/user/logout', formUrlEncoded({
          target_id: req.body.social_id,
          target_id_type: "user_id",
        }), {
        headers: {
          Authorization: `KakaoAK ${process.env.SERVICE_APP_ADMIN_KEY}`,
        }
      });
      console.log('Logout successful');
      res.status(200).json({
          status: 'success',
          message: 'Logged out successfully'
      });
  } catch(error) {
      console.log('error', error);
      
      res.status(400).json({
          status: 'error',
          message: 'Error during logout',
          detail: error.message  // 에러 메시지를 상세하게 전달
      });
  }
});

module.exports = router;
