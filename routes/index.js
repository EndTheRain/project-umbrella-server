const express = require('express');

const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
  // TODO: the entire frontend
  res.render('index', { title: 'Express' });
});

module.exports = router;
