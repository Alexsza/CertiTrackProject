var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'CertiTrack' });
});


router.post('/', function(req, res, next) {
  res.render('index', { title: 'CertiTrack', name:req.body.name });
});

router.get('/student', function(req, res, next) {
  res.render('student', { title: 'View your Diploma' });
});

router.get('/admin', function(req, res, next) {
  res.render('admin', { title: 'Admin Page' });
});

router.get('/createToken', function(req, res, next) {
  res.render('createToken', { title: 'Mint' });
});

router.get('/authenticate', function(req, res, next) {
  res.render('createToken', { title: 'Authenticate' });
});


module.exports = router;
