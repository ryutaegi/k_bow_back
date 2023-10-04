var express = require('express');
var router = express.Router();
const maria = require('../database/connect/maria'); //maria.js 경로 입력
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
