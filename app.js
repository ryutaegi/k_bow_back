var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const moment = require('moment-timezone');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var kakaoRouter = require('./routes/kakao');
var boardRouter = require('./routes/board/board_list');
var shotRouter = require('./routes/shot/shot');
var groupRouter = require('./routes/group/group')
var agreeRouter = require('./routes/agree')
var verifyToken = require('./middlewares/verifyToken');

var app = express();
const maria = require('./database/connect/maria');
maria.connect();

moment.tz.setDefault('Asia/Seoul');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
app.use('/users', usersRouter);
// '/api/kakao'로 들어오는 모든 요청에 대해 verifyToken 미들웨어를 먼저 적용합니다.
app.use('/api/board', verifyToken);
app.use('/api/board', boardRouter);

app.use('/api/shot', verifyToken);
app.use('/api/shot', shotRouter);

app.use('/api/group', verifyToken);
app.use('/api/group', groupRouter);

app.use('/api/agree', verifyToken);
app.use('/api/agree', agreeRouter);

app.use('/api/kakao', kakaoRouter);

// 이 미들웨어를 사용하는 라우트 예시
// app.get('/protected', verifyToken, (req, res) => {
//   // ... [이전에 작성한 라우트 핸들러의 코드]
// });


app.use(function(req, res, next) {
  next(createError(404));
});



app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
