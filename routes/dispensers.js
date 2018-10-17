const express = require('express');
const createError = require('http-errors');
const auth = require('./../util/auth');
const { Dispenser } = require('./../models');

const router = express.Router();

/* POST add a new dispenser to the network (must be admin, provide id/name/key) */
router.post('/add', auth.adminizer, (req, res, next) => {
  const { id, name, key } = req.query;
  if (!id || !name || !key) {
    return next(createError(400, 'Provide dispenser ID, name, key'));
  }
  if (id === 'admin') return next(createError(409, 'Bad ID'));

  auth.hash(id, key, (err, hash) => {
    if (err) return next(createError(500, err));
    const disp = new Dispenser({ _id: id, name, key: hash });
    disp.save((dispErr) => {
      if (dispErr) return next(createError(500, dispErr));
      return res.status(201).send(`Added dispenser ${id}`);
    });
  });
});

module.exports = router;
