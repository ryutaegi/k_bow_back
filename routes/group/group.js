const express = require('express');
const bcrypt = require('bcrypt');
const { SERVICE_APP_ADMIN_KEY, SECRET_KEY } = require('../../config/constants');
const maria = require('../../database/connect/maria');
const util = require('util');
const router = express.Router();

const mariaQuery = util.promisify(maria.query).bind(maria);
const SALT_ROUNDS = 10;

router.get('/list', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const sql = "SELECT group_id, group_name, group_description, is_password FROM kbow.group_info ORDER BY created_at DESC LIMIT ? OFFSET ?;";
    const result = await mariaQuery(sql, [limit, offset]);
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/join/list', async (req, res) => {
  const userIdFromToken = req.user.user_id;
  try {
    let result = await mariaQuery("SELECT group_id FROM kbow.group_user WHERE user_id=?;", [userIdFromToken]);
    if (result.length === 0) {
      return res.send(result);
    }
    const groupIds = result.map(row => row.group_id);
    result = await mariaQuery(
      "SELECT group_id, group_name, group_description, is_password, group_maker_id FROM kbow.group_info WHERE group_id IN (?);",
      [groupIds]
    );
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/join/public', async (req, res) => {
  const userIdFromToken = req.user.user_id;
  try {
    const check = await mariaQuery(
      "SELECT COUNT(*) AS count FROM kbow.group_user WHERE user_id=? AND group_id=?",
      [userIdFromToken, req.body.group_id]
    );
    if (check[0].count != 0) {
      return res.status(409).json({ error: 'duplication error' });
    }
    const result = await mariaQuery(
      "INSERT INTO kbow.group_user (user_id, group_id) VALUE(?,?)",
      [userIdFromToken, req.body.group_id]
    );
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/join/private', async (req, res) => {
  const userIdFromToken = req.user.user_id;
  try {
    // 중복 가입 체크
    const check = await mariaQuery(
      "SELECT COUNT(*) AS count FROM kbow.group_user WHERE user_id=? AND group_id=?",
      [userIdFromToken, req.body.group_id]
    );
    if (check[0].count != 0) {
      return res.status(409).json({ error: 'duplication error' });
    }

    // 비밀번호 검증 (bcrypt)
    const rows = await mariaQuery(
      "SELECT group_password FROM kbow.group_info WHERE group_id=?",
      [req.body.group_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: '그룹을 찾을 수 없습니다.' });
    }

    const isMatch = await bcrypt.compare(req.body.group_password, rows[0].group_password);
    if (!isMatch) {
      return res.status(401).json({ error: 'password error' });
    }

    const result = await mariaQuery(
      "INSERT INTO kbow.group_user (user_id, group_id) VALUE(?,?)",
      [userIdFromToken, req.body.group_id]
    );
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/list/memberdetail', async (req, res) => {
  try {
    const result = await mariaQuery(
      "SELECT kbow.group_user.user_id, kbow.users.nickname, kbow.users.image_url FROM kbow.group_user INNER JOIN kbow.users ON group_user.user_id = users.user_id WHERE group_user.group_id=?",
      [req.body.group_id]
    );
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

router.get('/rank/:group_id', async (req, res) => {
  const groupId = req.params.group_id;
  try {
    // 랭킹 계산을 DB에서 직접 처리
    const ratioRank = await mariaQuery(
      `SELECT gu.user_id, u.nickname,
         SUM(s.target_count) / SUM(s.shot_count) AS ratio
       FROM kbow.group_user AS gu
       INNER JOIN kbow.users AS u ON gu.user_id = u.user_id
       LEFT JOIN kbow.shots AS s ON gu.user_id = s.user_id
       WHERE gu.group_id = ? AND s.shot_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
       GROUP BY gu.user_id, u.nickname
       ORDER BY ratio DESC
       LIMIT 3;`,
      [groupId]
    );

    const countRank = await mariaQuery(
      `SELECT gu.user_id, u.nickname,
         COUNT(s.shot_id) AS session_count
       FROM kbow.group_user AS gu
       INNER JOIN kbow.users AS u ON gu.user_id = u.user_id
       LEFT JOIN kbow.shots AS s ON gu.user_id = s.user_id
       WHERE gu.group_id = ? AND s.shot_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
       GROUP BY gu.user_id, u.nickname
       ORDER BY session_count DESC
       LIMIT 3;`,
      [groupId]
    );

    res.json({ sortedRatioResults: ratioRank, sortedElementCountResults: countRank });
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/make', async (req, res) => {
  const userIdFromToken = req.user.user_id;
  try {
    const rows = await mariaQuery(
      "SELECT MAX(created_at) AS last_group_creation_time FROM kbow.group_info WHERE group_maker_id = ?",
      [userIdFromToken]
    );
    const lastGroupCreationTime = new Date(rows[0].last_group_creation_time);
    const currentTime = new Date();
    if (currentTime - lastGroupCreationTime < 5 * 60 * 1000) {
      return res.status(403).json({ error: '5분 이내에 신규 그룹을 생성할 수 없습니다.' });
    }

    // 비밀번호가 있는 경우에만 해시
    const hashedPassword = req.body.group_password
      ? await bcrypt.hash(req.body.group_password, SALT_ROUNDS)
      : null;

    const result = await mariaQuery(
      "INSERT INTO kbow.group_info (group_name, group_maker_id, group_password, is_password, group_description) VALUE(?,?,?,?,?)",
      [req.body.group_name, userIdFromToken, hashedPassword, req.body.is_password, req.body.group_description]
    );
    const result1 = await mariaQuery(
      "INSERT INTO kbow.group_user (user_id, group_id) VALUE(?,?)",
      [userIdFromToken, result.insertId]
    );
    res.send(result1);
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/withdraw', async (req, res) => {
  const userIdFromToken = req.user.user_id;
  try {
    const result = await mariaQuery(
      "DELETE FROM kbow.group_user WHERE user_id=? AND group_id=?",
      [userIdFromToken, req.body.group_id]
    );
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/delete', async (req, res) => {
  const userIdFromToken = req.user.user_id;
  try {
    const rows = await mariaQuery(
      "SELECT group_maker_id FROM kbow.group_info WHERE group_id = ?",
      [req.body.group_id]
    );
    if (!rows.length || rows[0].group_maker_id !== userIdFromToken) {
      return res.status(403).json({ error: '그룹 제작자만 삭제가 가능합니다' });
    }
    await mariaQuery("DELETE FROM kbow.group_board_comments WHERE post_id IN (SELECT post_id FROM kbow.group_board WHERE group_id = ?);", [req.body.group_id]);
    await mariaQuery("DELETE FROM kbow.group_board_like WHERE post_id IN (SELECT post_id FROM kbow.group_board WHERE group_id = ?);", [req.body.group_id]);
    await mariaQuery("DELETE FROM kbow.group_board WHERE group_id = ?;", [req.body.group_id]);
    await mariaQuery("DELETE FROM kbow.group_user WHERE group_id=?;", [req.body.group_id]);
    await mariaQuery("DELETE FROM kbow.group_info WHERE group_id = ?;", [req.body.group_id]);
    res.send({ message: 'deleted' });
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

router.post('/select', async (req, res) => {
  try {
    const result = await mariaQuery(
      "SELECT group_id, is_password FROM kbow.group_info WHERE group_name=?",
      [req.body.title]
    );
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: 'db error' });
  }
});

// 그룹 게시글 좋아요 토글 (목록 라우트보다 먼저 등록해야 충돌 방지)
router.post('/board/like/:post_id', async (req, res) => {
  try {
    const { user_id } = req.user;
    const { post_id } = req.params;

    const existing = await mariaQuery(
      `SELECT like_id FROM kbow.group_board_like WHERE post_id = ? AND user_id = ?`,
      [post_id, user_id]
    );
    if (existing.length > 0) {
      await mariaQuery(`DELETE FROM kbow.group_board_like WHERE post_id = ? AND user_id = ?`, [post_id, user_id]);
      return res.json({ liked: false });
    } else {
      await mariaQuery(`INSERT INTO kbow.group_board_like (post_id, user_id) VALUES (?, ?)`, [post_id, user_id]);
      return res.json({ liked: true });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 그룹 게시글 좋아요 수 + 내가 눌렀는지
router.get('/board/like/:post_id', async (req, res) => {
  try {
    const { user_id } = req.user;
    const { post_id } = req.params;

    const countResult = await mariaQuery(
      `SELECT COUNT(*) AS like_count FROM kbow.group_board_like WHERE post_id = ?`,
      [post_id]
    );
    const myLike = await mariaQuery(
      `SELECT like_id FROM kbow.group_board_like WHERE post_id = ? AND user_id = ?`,
      [post_id, user_id]
    );
    res.json({ like_count: countResult[0].like_count, liked: myLike.length > 0 });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 그룹 게시글 댓글 삭제 (comment 목록보다 먼저 등록)
router.post('/board/comment/delete/:comment_id', async (req, res) => {
  try {
    const { user_id } = req.user;
    const { comment_id } = req.params;

    const rows = await mariaQuery(
      `SELECT user_id FROM kbow.group_board_comments WHERE comment_id = ?`,
      [comment_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '댓글이 없습니다.' });
    if (rows[0].user_id !== user_id) return res.status(403).json({ error: '권한이 없습니다.' });

    await mariaQuery(`DELETE FROM kbow.group_board_comments WHERE comment_id = ?`, [comment_id]);
    res.json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 그룹 게시글 댓글 목록
router.get('/board/comment/:post_id', async (req, res) => {
  try {
    const { post_id } = req.params;
    const rows = await mariaQuery(
      `SELECT comment_id, user_id, nickname, content,
              CONVERT_TZ(created_at, 'UTC', 'Asia/Seoul') AS created_at_korean
       FROM kbow.group_board_comments
       WHERE post_id = ?
       ORDER BY created_at ASC`,
      [post_id]
    );
    res.json({ comments: rows });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 그룹 게시글 댓글 작성
router.post('/board/comment/:post_id', async (req, res) => {
  try {
    const { user_id, nickname } = req.user;
    const { post_id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0)
      return res.status(400).json({ error: '내용을 입력해주세요.' });
    if (content.length > 500)
      return res.status(400).json({ error: '500자 이내로 입력해주세요.' });

    await mariaQuery(
      `INSERT INTO kbow.group_board_comments (post_id, user_id, nickname, content) VALUES (?, ?, ?, ?)`,
      [post_id, user_id, nickname, content.trim()]
    );
    res.json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 그룹 게시글 목록
router.get('/board/:group_id/:page', async (req, res) => {
  try {
    const { group_id, page } = req.params;
    const limit = 20;
    const offset = (page - 1) * limit;
    const rows = await mariaQuery(
      `SELECT b.post_id, b.user_id, b.nickname, b.title, b.content,
              CONVERT_TZ(b.created_at, 'UTC', 'Asia/Seoul') AS created_at_korean,
              COUNT(DISTINCT l.like_id) AS like_count,
              COUNT(DISTINCT c.comment_id) AS comment_count
       FROM kbow.group_board b
       LEFT JOIN kbow.group_board_like l ON b.post_id = l.post_id
       LEFT JOIN kbow.group_board_comments c ON b.post_id = c.post_id
       WHERE b.group_id = ?
       GROUP BY b.post_id
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [group_id, limit, offset]
    );
    res.json(rows);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 그룹 게시글 작성 (그룹 멤버 확인)
router.post('/board/create', async (req, res) => {
  try {
    const { user_id, nickname } = req.user;
    const { group_id, title, content } = req.body;

    if (!title || title.trim().length === 0) return res.status(400).json({ error: '제목을 입력해주세요.' });
    if (!content || content.trim().length === 0) return res.status(400).json({ error: '내용을 입력해주세요.' });
    if (title.length > 50) return res.status(400).json({ error: '제목은 50자 이내로 입력해주세요.' });
    if (content.length > 1000) return res.status(400).json({ error: '내용은 1000자 이내로 입력해주세요.' });

    const member = await mariaQuery(
      `SELECT 1 FROM kbow.group_user WHERE group_id = ? AND user_id = ?`,
      [group_id, user_id]
    );
    if (member.length === 0) return res.status(403).json({ error: '그룹 멤버만 작성할 수 있습니다.' });

    await mariaQuery(
      `INSERT INTO kbow.group_board (group_id, user_id, nickname, title, content) VALUES (?, ?, ?, ?, ?)`,
      [group_id, user_id, nickname, title.trim(), content.trim()]
    );
    res.json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

// 그룹 게시글 삭제 (본인만)
router.post('/board/delete/:post_id', async (req, res) => {
  try {
    const { user_id } = req.user;
    const { post_id } = req.params;

    const rows = await mariaQuery(
      `SELECT user_id FROM kbow.group_board WHERE post_id = ?`,
      [post_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '게시글이 없습니다.' });
    if (rows[0].user_id !== user_id) return res.status(403).json({ error: '권한이 없습니다.' });

    await mariaQuery(`DELETE FROM kbow.group_board_comments WHERE post_id = ?`, [post_id]);
    await mariaQuery(`DELETE FROM kbow.group_board_like WHERE post_id = ?`, [post_id]);
    await mariaQuery(`DELETE FROM kbow.group_board WHERE post_id = ?`, [post_id]);
    res.json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
