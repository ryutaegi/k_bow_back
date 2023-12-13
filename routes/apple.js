const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
//const { getUserBySocialId, createUser } = require('../database/queries/userQueries');
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

router.post('/login', async (req, res) => {
    const token = req.body.token;
    console.log(token);
    
jwt.verify(token, getKey, { algorithms: ['RS256'] }, function(err, decoded) {
  if (err) {
    // 토큰 검증 실패
    console.log(err);
    res.status(400).json({
      status: 'error',
      message: 'Error during logout',
      detail: err.message  // 에러 메시지를 상세하게 전달
  });
  } else {
    // 토큰 검증 성공
    console.log(decoded);
    res.status(200).json({
      status: 'success',
      message: 'Login out successfully'
  });
    // 여기서 사용자 정보에 기반한 로직을 수행
  }
});
    
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
