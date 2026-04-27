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

router.get('/list/:boardType/:page', async (req, res) => {
  try {
    const boardType = req.params.boardType;
    const page = req.params.page;
    const limit = 10; // 한 페이지에 표시할 게시글 수
    const offset = (page - 1) * limit; // 건너뛸 게시글 수

    var sql = `
      SELECT b.*, CONVERT_TZ(b.created_at, 'UTC', 'Asia/Seoul') AS created_at_korean,
             COUNT(DISTINCT l.like_id) AS like_count,
             COUNT(DISTINCT c.comment_id) AS comment_count
      FROM kbow.board b
      LEFT JOIN kbow.board_like l ON b.board_id = l.board_id
      LEFT JOIN kbow.board_comments c ON b.board_id = c.board_id
      WHERE b.board_type_id = ?
      GROUP BY b.board_id
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;
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





// 좋아요 토글
router.post('/like/:board_id', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const boardId = req.params.board_id;

    const existing = await mariaQuery(
      'SELECT like_id FROM kbow.board_like WHERE board_id = ? AND user_id = ?',
      [boardId, userId]
    );

    if (existing.length > 0) {
      await mariaQuery(
        'DELETE FROM kbow.board_like WHERE board_id = ? AND user_id = ?',
        [boardId, userId]
      );
      return res.json({ liked: false });
    } else {
      await mariaQuery(
        'INSERT INTO kbow.board_like (board_id, user_id) VALUES (?, ?)',
        [boardId, userId]
      );
      return res.json({ liked: true });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'db error' });
  }
});

// 좋아요 수 + 내가 눌렀는지 조회
router.get('/like/:board_id', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const boardId = req.params.board_id;

    const countResult = await mariaQuery(
      'SELECT COUNT(*) AS like_count FROM kbow.board_like WHERE board_id = ?',
      [boardId]
    );
    const myLike = await mariaQuery(
      'SELECT like_id FROM kbow.board_like WHERE board_id = ? AND user_id = ?',
      [boardId, userId]
    );

    res.json({
      like_count: countResult[0].like_count,
      liked: myLike.length > 0,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'db error' });
  }
});

// 인기 게시글 (최근 7일, 좋아요 많은 순 2개)
router.get('/popular', async (req, res) => {
  try {
    const rows = await mariaQuery(`
      SELECT b.board_id, b.board_type_id, b.title, b.nickname,
             CONVERT_TZ(b.created_at, 'UTC', 'Asia/Seoul') AS created_at_korean,
             COUNT(DISTINCT l.like_id) AS like_count
      FROM kbow.board b
      LEFT JOIN kbow.board_like l ON b.board_id = l.board_id
      GROUP BY b.board_id
      ORDER BY like_count DESC, b.created_at DESC
      LIMIT 2
    `);
    res.json(rows);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 댓글 목록 조회
router.get('/comment/:board_id', async (req, res) => {
  try {
    const { board_id } = req.params;
    const rows = await mariaQuery(
      `SELECT comment_id, user_id, nickname, content,
              CONVERT_TZ(created_at, 'UTC', 'Asia/Seoul') AS created_at_korean
       FROM kbow.board_comments
       WHERE board_id = ?
       ORDER BY created_at ASC`,
      [board_id]
    );
    res.json({ comments: rows });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 댓글 작성
router.post('/comment/:board_id', async (req, res) => {
  try {
    const { board_id } = req.params;
    const { user_id, nickname } = req.user;
    const { content } = req.body;

    if (!content || content.trim().length === 0)
      return res.status(400).json({ error: '내용을 입력해주세요.' });
    if (content.length > 500)
      return res.status(400).json({ error: '500자 이내로 입력해주세요.' });

    await mariaQuery(
      `INSERT INTO kbow.board_comments (board_id, user_id, nickname, content) VALUES (?, ?, ?, ?)`,
      [board_id, user_id, nickname, content.trim()]
    );
    res.json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 댓글 삭제
router.post('/comment/delete/:comment_id', async (req, res) => {
  try {
    const { comment_id } = req.params;
    const { user_id } = req.user;

    const rows = await mariaQuery(
      `SELECT user_id FROM kbow.board_comments WHERE comment_id = ?`,
      [comment_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '댓글이 없습니다.' });
    if (rows[0].user_id !== user_id) return res.status(403).json({ error: '권한이 없습니다.' });

    await mariaQuery(`DELETE FROM kbow.board_comments WHERE comment_id = ?`, [comment_id]);
    res.json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
