const createError = require('http-errors');
const { Umbrella, User, Lease } = require('./../models');
const emailer = require('./emailer');

// middleware to get umbrella by ID
function getUmb(req, res, next) {
  const { umbId } = req.params;
  if (!umbId) return next(createError(400, 'Provide umbrella ID'));

  Umbrella.findById(umbId, (err, umb) => {
    if (err) return next(createError(500, err));
    if (!umb) return next(createError(404, 'Umbrella not found'));

    req.umb = umb;
    next();
  });
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
        emailer.send({
          template: 'join',
          message: {
            to: `${andrewId}@andrew.cmu.edu`,
          },
          locals: {
            andrew_id: andrewId,
          },
        }).then().catch();
        next();
      });
    } else {
      req.andrewUser = user;
      next();
    }
  });
}

// middleware to get an open lease by user and umbrella
function getSomeLease(req, res, next) {
  const { andrewId } = req.query;
  if (!andrewId) return next(createError(400, 'Provide Andrew ID'));

  const { umbId } = req.params;
  if (!umbId) return next(createError(400, 'Provide umbrella ID'));

  Lease.findOne({
    is_open: true,
    $or: [{ user: andrewId }, { umbrella: umbId }],
  }, (err, lease) => {
    if (err) return next(createError(500, err));
    req.openLease = lease;
    next();
  });
}

// middleware to get an open lease for an umbrella
function getUmbLease(req, res, next) {
  const { umbId } = req.params;
  if (!umbId) return next(createError(400, 'Provide umbrella ID'));

  Lease.findOne({ is_open: true, umbrella: umbId }, (err, lease) => {
    if (err) return next(createError(500, err));
    req.openLease = lease;
    next();
  });
}

module.exports = {
  getUmb, getCreateUser, getSomeLease, getUmbLease,
};
