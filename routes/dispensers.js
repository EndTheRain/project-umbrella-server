const express = require('express');
const createError = require('http-errors');
const auth = require('./../util/auth');
const { Dispenser } = require('./../models');

const router = express.Router();

/* GET ping-pong with dispensers to check availability */
router.get('/ping', auth.authorizer, (req, res) => res.send(200));

/* POST add a new dispenser to the network (ADMIN, provide id/name/key) */
router.post('/add', auth.adminizer, (req, res, next) => {
  const { id, name, key } = req.query;
  if (!id || !name || !key) return next(createError(400, 'Provide dispenser ID, name, key'));
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

/* POST make a dispenser (un)available for use (ADMIN) */
router.post('/:id/(|available|unavailable)', auth.adminizer, (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(createError(400, 'Provide dispenser ID'));

  Dispenser.findById(id, (err, disp) => {
    if (err) return next(createError(500, err));
    if (!disp) return next(createError(404, 'Umbrella not found'));

    const state = req.path.substring(req.path.lastIndexOf('/') + 1);
    disp.status = state === 'available'; // eslint-disable-line no-param-reassign
    disp.save((saveErr) => {
      if (saveErr) return next(createError(500, saveErr));
      return res.send(`Dispenser ${id} available ${disp.status}`);
    });
  });
});

/* POST update details about a disepnser (ADMIN, provide data in body) */
router.post('/:id/update', auth.adminizer, (req, res, next) => {
  if (Object.keys(req.body).length === 0) return next(createError(400, 'Provide data'));

  const { id } = req.params;
  Dispenser.findById(id, (err, disp) => {
    if (err) return next(createError(500, err));
    if (!disp) return next(createError(404, 'Dispenser not found'));
    Object.entries(req.body).forEach(([field, value]) => {
      if (field !== 'key') disp[field] = value; // eslint-disable-line no-param-reassign
    });
    disp.save((saveErr) => {
      if (saveErr) return next(createError(500, saveErr));
      return res.send(`Updated dispenser ${id}`);
    });
  });
});

module.exports = router;
