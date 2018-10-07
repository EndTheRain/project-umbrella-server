const express = require('express');
const auth = require('express-basic-auth');
const createError = require('http-errors');
const authConf = require('./../config.json');
const emailer = require('./../emailer');
const Dispenser = require('./../models/Dispenser');
const User = require('./../models/User');

const router = express.Router();

// middleware to get dispenser by ID
function getDisp(req, res, next) {
  const { id } = req.params;
  if (!id) return next(createError(400, 'Provide dispenser ID'));

  Dispenser.findById(id, (err, disp) => {
    if (err) return next(createError(500, err));
    if (!disp) return next(createError(404, 'Dispenser not found'));

    req.disp = disp;
    next();
  });
}

// middleware to get umbrella by ID (comes after getDisp)
function getUmb(req, res, next) {
  if (!req.disp) return next(createError(500, 'Dispenser not fetched'));

  const { umbId } = req.params;
  if (!umbId) return next(createError(400, 'Provide umbrella ID'));

  const umb = req.disp.umbrellas.id(umbId);
  if (!umb) return next(createError(404, 'Umbrella not found'));

  req.umb = umb;
  next();
}

// middleware to get or create user by Andrew ID
function getCreateUser(req, res, next) {
  const { andrewId } = req.query;
  if (!andrewId) return next(createError(400, 'Provide Andrew ID'));

  User.findById(andrewId, (err, user) => {
    if (err) return next(createError(500, err));
    if (!user) {
      const newUser = new User({ _id: andrewId });
      newUser.save((saveErr) => {
        if (err) return next(createError(500, saveErr));
        req.andrewUser = newUser;
        next();
      });
    } else {
      req.andrewUser = user;
      next();
    }
  });
}

/* POST add a new dispenser to the network (must be admin) */
router.post('/add', auth(authConf), (req, res, next) => {
  if (req.auth.username !== 'admin') return next(createError(401, 'Not admin'));

  const { id, name } = req.query;
  if (!id || !name) {
    return next(createError(400, 'Provide dispenser ID and name'));
  }

  const disp = new Dispenser({ _id: id, name });
  disp.save((err) => {
    if (err) return next(createError(500, err));
    return res.status(201).send(`Added dispenser ${id}`);
  });
});

/* POST add a new umbrella to the dispenser (must be admin) */
router.post('/:id/umbrellas/add', auth(authConf), getDisp, (req, res, next) => {
  if (req.auth.username !== 'admin') return next(createError(401, 'Not admin'));

  const { umbId } = req.query;
  if (!umbId) return next(createError(400, 'Provide umbrella ID'));

  req.disp.umbrellas.push({ _id: umbId, storage_location: req.disp._id });
  req.disp.save((err) => {
    if (err) return next(createError(500, err));
    return res.status(201).send(`Added umbrella ${umbId}`);
  });
});

/* POST borrow an umbrella from a dispenser */
router.post('/:id/umbrellas/:umbId/borrow', auth(authConf), [
  getDisp, getUmb, getCreateUser,
], (req, res, next) => {
  if (req.umb.borrower) next(createError(409, 'Umbrella in use'));

  req.umb.borrower = req.andrewUser._id;
  req.umb.borrowed_at = Date.now();
  req.disp.save((err) => {
    if (err) return next(createError(500, err));
    // TODO: send a borrow confirmation email
    return res.send(`Umbrella ${req.umb._id} borrowed by ${req.andrewUser._id}`);
  });
});

/* POST return an umbrella to a dispenser */
router.post('/:id/umbrellas/:umbId/return', auth(authConf), [
  getDisp, getUmb, getCreateUser,
], (req, res, next) => {
  const { returnedDate } = req.query;
  if (!returnedDate) return next(createError(400, 'Provide datetime'));
  if (!req.umb.borrower) return next(createError(409, 'Umbrella not out'));
  if (req.umb.borrower !== req.andrewUser._id) {
    return next(createError(409, 'Umbrella borrower mismatch'));
  }

  req.andrewUser.history.push({
    umbrella_id: req.umb._id,
    borrowed_at: req.umb.borrowed_at,
    borrowed_from: req.umb.storage_location,
    returned_at: returnedDate,
    returned_to: req.disp._id,
  });
  req.andrewUser.save((userErr) => {
    if (userErr) return next(createError(500, userErr));
    req.umb.borrower = null;
    req.umb.borrowed_at = null;
    req.umb.storage_location = req.disp._id;
    req.disp.save((dispErr) => {
      if (dispErr) return next(createError(500, dispErr));
      // TODO: send a return confirmation email
      return res.send(`Umbrella ${req.umb._id} returned by ${req.andrewUser._id}`);
    });
  });
});

module.exports = router;
