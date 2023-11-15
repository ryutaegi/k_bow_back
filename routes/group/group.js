
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
	sql = "SELECT group_id, group_name, group_description, is_password FROM kbow.group_info WHERE group_id IN (?);";
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
    const user_nickname = item.nickname;
    const userId = item.user_id;
    const ratio = item.target_count / item.shot_count;
    const elementCount = item.shot_count;

    // ratio 결과를 처리합니다.
    if (!userRatioResults[userId] || ratio > userRatioResults[userId].ratio) {
        userRatioResults[userId] = { user_id: userId, ratio: ratio, nickname : user_nickname };
    }

    // elementCount 결과를 처리합니다.
    if (!userElementCountResults[userId] || elementCount > userElementCountResults[userId].elementCount) {
        userElementCountResults[userId] = { user_id: userId, elementCount: elementCount, nickname : user_nickname };
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




res.json({ sortedRatioResults, sortedElementCountResults });
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});


router.post('/make', async (req, res) => {
  const userIdFromToken = req.user.user_id;

  try {
    var sql = "SELECT MAX(created_at) AS last_group_creation_time FROM kbow.group_info WHERE group_maker_id = ?"
    const rows = await mariaQuery(sql, [userIdFromToken]);
      const lastGroupCreationTime = new Date(rows[0].last_group_creation_time);
      const currentTime = new Date();
console.log("last", lastGroupCreationTime);
	    console.log("current", currentTime);
     // 현재 시간과 이전 그룹 생성 시간을 비교하여 5분 이내에 그룹을 생성한 경우 새 그룹 생성을 막습니다.
      const fiveMinutesInMillis = 5 * 60 * 1000; // 5분을 밀리초로 변환
      const timeDifference = currentTime - lastGroupCreationTime;

      if (timeDifference < fiveMinutesInMillis) {
        res.status(403).json({ error: '5분 이내에 신규 그룹을 생성할 수 없습니다.' });
        return;
    }
    sql = "INSERT INTO kbow.group_info (group_name, group_maker_id, group_password, is_password, group_description) VALUE(?,?,?,?,?)";
    let insert_value = [req.body.group_name, userIdFromToken, req.body.group_password, req.body.is_password, req.body.group_description];
    let result = await mariaQuery(sql, insert_value);

    // 새로운 레코드의 group_id를 가져오는 쿼리
    sql = "SELECT LAST_INSERT_ID() as lastGroupId";
    let idResult = await mariaQuery(sql);

// 가져온 group_id를 출력
console.log("Inserted record group_id is", idResult[0].lastGroupId);
	  
    sql = "INSERT INTO kbow.group_user (user_id, group_id) VALUE(?,?)";
    insert_value = [userIdFromToken, req.body.group_id];
    result = await mariaQuery(sql, insert_value);

    console.log("result is",result);
    res.send(result);
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});

router.post('/withdraw', async (req, res) => {
  const userIdFromToken = req.user.user_id;

  try {
    var sql = "DELETE FROM kbow.group_user WHERE user_id=? AND group_id";
    let insert_value = [userIdFromToken, req.body.group_id];
    let result = await mariaQuery(sql, insert_value);
    console.log(result);
    res.send(result);
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});

router.post('/delete', async (req, res) => {
  const userIdFromToken = req.user.user_id;

  try {
    var sql = "SELECT group_maker_id FROM kbow.group_info WHERE group_id = ?"
    const rows = await mariaQuery(sql, [req.body.group_id]);
    console.log(rows[0].group_maker_id);
    if(rows[0].group_maker_id !== userIdFromToken)
	  {
		  res.status(403).json({'error' : "그룹 제작자만 삭제가 가능합니다"});
		  return;

	  }

    sql = "DELETE FROM kbow.group_info WHERE group_id = ?;";
    let insert_value = [req.body.group_id];
    let result = await mariaQuery(sql, insert_value);
	sql = "DELETE FROM kbow.group_user WHERE group_id=?;";
	result = await mariaQuery(sql, insert_value);
    console.log(result);
    res.send(result);
  } catch (error) {
    console.log('error', error);
    res.status(403).json({ error: 'db error' });
  }
});

module.exports = router;
