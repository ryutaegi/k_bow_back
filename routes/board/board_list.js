const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { SERVICE_APP_ADMIN_KEY, SECRET_KEY } = require('../../config/constants');
//const { getUserBySocialId, createUser } = require('../database/queries/userQueries');
const maria = require('../../database/connect/maria');
const router = express.Router();
const util = require('util');
// Convert the callback-based maria.query to a promise-based function
const mariaQuery = util.promisify(maria.query).bind(maria);

router.get('/list/:boardType', async (req, res) => {
  try {
    const boardType = req.params.boardType;
    const page = req.params.page;
    const limit = 10; // 한 페이지에 표시할 게시글 수
    const offset = (page - 1) * limit; // 건너뛸 게시글 수

    var sql = "SELECT *, CONVERT_TZ(created_at, 'UTC', 'Asia/Seoul') AS created_at_korean FROM kbow.board WHERE board_type_id = ? LIMIT ? OFFSET ?;";
      maria.query(sql, [boardType, limit, offset], (err, result) => {
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


router.get('/detail/:board_id', async (req, res) => {
  try {
	  const today = new Date();
	  console.log(today);
      const board_id = req.params.board_id; // 게시판 유형 가져오기

      var sql = "SELECT *, CONVERT_TZ(created_at, 'UTC', 'Asia/Seoul') AS created_at_korean FROM kbow.board WHERE board_id = ?;";
      maria.query(sql, [board_id], (err, result) => {
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

router.post('/create', async (req, res) => {
    const userIdFromToken = req.user.user_id;
    try {
        var sql = "SELECT MAX(created_at) AS last_group_creation_time FROM kbow.board WHERE user_id = ?"
        const rows = await mariaQuery(sql, [userIdFromToken]);
          const lastGroupCreationTime = new Date(rows[0].last_group_creation_time);
          const currentTime = new Date();
    console.log("last", lastGroupCreationTime);
            console.log("current", currentTime);
         // 현재 시간과 이전 그룹 생성 시간을 비교하여 5분 이내에 그룹을 생성한 경우 새 그룹 생성을 막습니다.
          const fiveMinutesInMillis = 3 * 60 * 1000; // 5분을 밀리초로 변환
          const timeDifference = currentTime - lastGroupCreationTime;
    
          if (timeDifference < fiveMinutesInMillis) {
            res.status(403).json({ error: '3분 이내에 새 게시글을 작성할 수 없습니다.' });
            return;
        }


            sql = "INSERT INTO kbow.board(board_type_id, user_id, nickname, title, content) VALUES(?,?,?,?,?)";
            let insert_value = [req.body.board_type, req.user.user_id, req.user.nickname, req.body.title, req.body.content]; 
      
            maria.query(sql, insert_value, (err, result) => {
              if (err) {
                console.log(err);
                res.status(500).json({ error: 'Database Error' }); // DB 오류 메시지 전송
                return;
              }
              res.send(insert_value);
        });
    } catch (error) {
        console.log('error', error);
        res.status(403).json({ error: 'db error' });
    }
  });

  router.post('/delete/:board_id', async (req, res) => {
    try {
        const userIdFromToken = req.user.user_id; // verifyToken 미들웨어에서 설정한 req.user를 사용하여 user_id를 가져옵니다.
        const boardId = req.params.board_id; // URL에서 board_id 파라미터 값을 가져옵니다.

        // board_id에 해당하는 행의 user_id가 요청이 들어온 user_id와 일치하는지 확인하는 SQL 쿼리입니다.
        var sqlCheck = "SELECT * FROM kbow.board WHERE board_id = ? AND user_id = ?";
        maria.query(sqlCheck, [boardId, userIdFromToken], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Database Error' });
            }
            
            if (result.length === 0) {
                return res.status(403).json({ error: 'Not authorized or no such board' });
            }

            // user_id가 일치하면, 해당 행을 삭제하는 SQL 쿼리입니다.
            var sqlDelete = "DELETE FROM kbow.board WHERE board_id = ?";
            maria.query(sqlDelete, [boardId], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ error: 'Database Error' });
                }

                res.status(200).json({ message: 'Successfully deleted' });
            });
        });
    } catch (error) {
        console.log('error', error);
        res.status(403).json({ error: 'db error' });
    }
});

router.post('/modify/:board_id', async (req, res) => {
    try {
        const userIdFromToken = req.user.user_id; 
        const boardId = req.params.board_id; 

        const { title, content } = req.body;

        var sqlCheck = "SELECT * FROM kbow.board WHERE board_id = ? AND user_id = ?";
        maria.query(sqlCheck, [boardId, userIdFromToken], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Database Error' });
            }
            
            if (result.length === 0) {
                return res.status(403).json({ error: 'Not authorized or no such board' });
            }

            // user_id가 일치하면, 해당 행의 title과 content를 업데이트하는 SQL 쿼리입니다.
            var sqlUpdate = "UPDATE kbow.board SET title = ?, content = ? WHERE board_id = ?";
            maria.query(sqlUpdate, [title, content, boardId], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ error: 'Database Error' });
                }

                res.status(200).json({ message: 'Successfully updated' });
            });
        });
    } catch (error) {
        console.log('error', error);
        res.status(403).json({ error: 'db error' });
    }
});





module.exports = router;
