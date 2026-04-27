const express = require('express');
const maria = require('../database/connect/maria');
const util = require('util');
const { SERVICE_APP_ADMIN_KEY } = require('../config/constants');
const router = express.Router();

const mariaQuery = util.promisify(maria.query).bind(maria);

// 관리자 키 검증 미들웨어
const verifyAdminKey = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (!key || key !== SERVICE_APP_ADMIN_KEY) {
    return res.status(403).json({ error: '권한 없음' });
  }
  next();
};

// 팝업 등록 (관리자 전용)
router.post('/', verifyAdminKey, async (req, res) => {
  const { type = 'notice', title, content, min_version, start_date, end_date } = req.body;
  if (!title) return res.status(400).json({ error: 'title 필수' });
  try {
    // 기존 활성 팝업 비활성화 후 새로 등록
    await mariaQuery('UPDATE popup SET is_active = 0 WHERE is_active = 1');
    const result = await mariaQuery(
      'INSERT INTO popup (type, title, content, min_version, is_active, start_date, end_date) VALUES (?, ?, ?, ?, 1, ?, ?)',
      [type, title, content ?? null, min_version ?? null, start_date ?? null, end_date ?? null]
    );
    res.json({ popup_id: result.insertId });
  } catch (error) {
    console.error('popup 등록 오류:', error);
    res.status(500).json({ error: 'db error' });
  }
});

// 팝업 비활성화 (관리자 전용)
router.delete('/:id', verifyAdminKey, async (req, res) => {
  try {
    await mariaQuery('UPDATE popup SET is_active = 0 WHERE popup_id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('popup 삭제 오류:', error);
    res.status(500).json({ error: 'db error' });
  }
});

// 현재 활성화된 팝업 조회 (JWT 불필요 — 로그인 전에도 표시)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const sql = `
      SELECT popup_id, type, title, content, min_version
      FROM popup
      WHERE is_active = 1
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
      ORDER BY type DESC, created_at DESC
      LIMIT 1
    `;
    // force_update가 있으면 우선 반환 (ORDER BY type DESC: force_update > notice)
    const rows = await mariaQuery(sql, [now, now]);

    if (rows.length === 0) {
      return res.json({ popup: null });
    }

    res.json({ popup: rows[0] });
  } catch (error) {
    console.error('popup 조회 오류:', error);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
