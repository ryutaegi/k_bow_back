const express = require('express');
const maria = require('../database/connect/maria');
const router = express.Router();

router.post('/withdraw', async (req, res) => {
  const userIdFromToken = req.user.user_id;

  maria.getConnection((err, conn) => {
    if (err) return res.status(500).json({ error: 'db connection error' });

    conn.beginTransaction(async (err) => {
      if (err) {
        conn.release();
        return res.status(500).json({ error: 'transaction error' });
      }

      const query = (sql, params) =>
        new Promise((resolve, reject) => {
          conn.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
        });

      try {
        await query("DELETE FROM kbow.shots WHERE user_id = ?", [userIdFromToken]);
        await query("DELETE FROM kbow.board WHERE user_id = ?", [userIdFromToken]);
        await query("DELETE FROM kbow.group_user WHERE user_id = ?", [userIdFromToken]);
        await query("DELETE FROM kbow.users WHERE user_id = ?", [userIdFromToken]);

        conn.commit((err) => {
          conn.release();
          if (err) return res.status(500).json({ error: 'commit error' });
          res.status(200).json({ message: 'Successfully deleted' });
        });
      } catch (error) {
        conn.rollback(() => {
          conn.release();
          res.status(500).json({ error: 'db error' });
        });
      }
    });
  });
});

module.exports = router;
