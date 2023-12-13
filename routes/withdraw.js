const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
//const { getUserBySocialId, createUser } = require('../database/queries/userQueries');
const maria = require('../database/connect/maria');
const router = express.Router();



router.post('/withdraw', async (req, res) => {
  try {
    const userIdFromToken = req.user.user_id; // verifyToken 미들웨어에서 설정한 req.user를 사용하여 user_id를 가져옵니다.
        // user_id가 일치하면, 해당 행을 삭제하는 SQL 쿼리입니다.
        var sqlDelete = "DELETE FROM kbow.board WHERE user_id = ?";
        maria.query(sqlDelete, [userIdFromToken], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Database Error' });
            }

            
        });

        sqlDelete = "DELETE FROM kbow.group_user WHERE user_id = ?";
        maria.query(sqlDelete, [userIdFromToken], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Database Error' });
            }
            
        });

        sqlDelete = "DELETE FROM kbow.users WHERE user_id = ?";
        maria.query(sqlDelete, [userIdFromToken], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Database Error' });
            }
            
        });

        
        return res.status(200).json({ message: 'Successfully deleted' });
} catch (error) {
    console.log('error', error);
    return res.status(403).json({ error: 'db error' });
}
});



module.exports = router;
