const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']; // 토큰을 헤더에서 가져옵니다.
    if (!token) {
        return res.status(403).send({ message: '토큰이 제공되지 않았습니다.' });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ message: '토큰이 유효하지 않습니다.' });
        }
        req.user = decoded; // 토큰이 유효하면 decoded 정보를 req.user에 저장합니다.
        console.log("AccessToken 유효")
        next(); // 다음 미들웨어 혹은 라우터 핸들러로 넘어갑니다.
    });
};

module.exports = verifyToken;