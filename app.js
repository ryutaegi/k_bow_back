var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const moment = require('moment-timezone');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var appleRouter = require('./routes/apple');
var kakaoRouter = require('./routes/kakao');
var naverRouter = require('./routes/naver');
var boardRouter = require('./routes/board/board_list');
var shotRouter = require('./routes/shot/shot');
var groupRouter = require('./routes/group/group');
var agreeRouter = require('./routes/agree');
var withdrawRouter = require('./routes/withdraw');
var verifyToken = require('./middlewares/verifyToken');

var app = express();

moment.tz.setDefault('Asia/Seoul');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 로그인 API에만 rate limit 적용 (1분에 10회)
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});
app.use('/api/kakao/login', loginLimiter);
app.use('/api/naver/login', loginLimiter);
app.use('/api/apple/login', loginLimiter);

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use('/api/board', verifyToken);
app.use('/api/board', boardRouter);

app.use('/api/shot', verifyToken);
app.use('/api/shot', shotRouter);

app.use('/api/group', verifyToken);
app.use('/api/group', groupRouter);

app.use('/api/agree', verifyToken);
app.use('/api/agree', agreeRouter);

app.use('/api/withdraw', verifyToken);
app.use('/api/withdraw', withdrawRouter);

app.use('/api/kakao', kakaoRouter);
app.use('/api/naver', naverRouter);
app.use('/api/apple', appleRouter);

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
