
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

router.get('/join/list', async (req, res) => {
    const userIdFromToken = req.user.user_id;
    try {
      var sql = "SELECT group_id FROM kbow.group_user WHERE user_id=?;";
      let insert_value = [userIdFromToken];
      let result = await mariaQuery(sql, insert_value);

        insert_value = result.map(row => row.group_id);
	console.log(insert_value);
	sql = "SELECT group_id, group_name, group_description FROM kbow.group_info WHERE group_id IN (?);";
      result = await mariaQuery(sql, [insert_value]);
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

router.post('/list/memberdetail', async (req, res) => {
  const userIdFromToken = req.user.user_id;

  try {
    var sql = "SELECT kbow.group_user.user_id, kbow.users.nickname, kbow.users.image_url FROM kbow.group_user INNER JOIN kbow.users ON group_user.user_id = users.user_id WHERE group_user.group_id=?";
    const insert_value = [req.body.group_id];
    let result = await mariaQuery(sql, insert_value);
console.log(result);
    res.send(result);
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});

router.get('/rank/:group_id', async (req, res) => {
  const userIdFromToken = req.user.user_id;
  const groupId = req.params.group_id;
  var target = 0;
  var shot = 0;
  try {
    var sql = 'SELECT gu.user_id, u.nickname, s.target_count, s.shot_count FROM kbow.group_user AS gu INNER JOIN kbow.users AS u ON gu.user_id = u.user_id LEFT JOIN kbow.shots AS s ON gu.user_id = s.user_id WHERE gu.group_id = ? AND s.shot_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH) GROUP BY gu.user_id, u.nickname, s.target_count, s.shot_count;'
    let insert_value = [groupId];
    let result = await mariaQuery(sql, insert_value);
    console.log(result);

  
    // 사용자별 최상위 ratio와 elementCount 결과를 저장할 객체를 생성합니다.
const userRatioResults = {};
const userElementCountResults = {};

// 각 사용자별로 target_count / shot_count 계산하고 요소 개수 파악
result.forEach(item => {
    const userId = item.user_id;
    const ratio = item.target_count / item.shot_count;
    const elementCount = item.shot_count;

    // ratio 결과를 처리합니다.
    if (!userRatioResults[userId] || ratio > userRatioResults[userId].ratio) {
        userRatioResults[userId] = { user_id: userId, ratio: ratio };
    }

    // elementCount 결과를 처리합니다.
    if (!userElementCountResults[userId] || elementCount > userElementCountResults[userId].elementCount) {
        userElementCountResults[userId] = { user_id: userId, elementCount: elementCount };
    }
});

// ratio를 기준으로 내림차순으로 정렬하여 상위 3순위 출력
const sortedRatioResults = Object.values(userRatioResults).sort((a, b) => b.ratio - a.ratio);
console.log("Top 3 by Ratio:");
for (let i = 0; i < Math.min(3, sortedRatioResults.length); i++) {
    const results = sortedRatioResults[i];
    console.log(`Rank ${i + 1}: User ID ${results.user_id}, Ratio ${results.ratio}`);
}

// elementCount를 기준으로 내림차순으로 정렬하여 상위 3순위 출력
const sortedElementCountResults = Object.values(userElementCountResults).sort((a, b) => b.elementCount - a.elementCount);
console.log("Top 3 by Element Count:");
for (let i = 0; i < Math.min(3, sortedElementCountResults.length); i++) {
    const results = sortedElementCountResults[i];
    console.log(`Rank ${i + 1}: User ID ${results.user_id}, Element Count ${results.elementCount}`);
}




	  res.send(result);
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});

module.exports = router;
