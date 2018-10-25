const express = require('express');

const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  // TODO: the entire frontend
  res.render('index', { title: 'Express' });
});

/* GET admin console */
router.get('/admin', (req, res) => {
  res.render('admin');
});

module.exports = router;
