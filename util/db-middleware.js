const createError = require('http-errors');
const { Umbrella, User, Lease } = require('./../models');
const emailer = require('./emailer');

// middleware to get umbrella by ID
function getUmb(req, res, next) {
  const { id } = req.params;
  if (!id) return next(createError(400, 'Provide umbrella ID'));

  Umbrella.findOne({ _id: id, status: true }, (err, umb) => {
    if (err) return next(createError(500, err));
    if (!umb) return next(createError(404, 'Umbrella not found'));

    req.umb = umb;
    next();
  });
}

// middleware to get or create user by Andrew ID
function getCreateUser(req, res, next) {
  const { cardId } = req.body;
  if (!cardId) return next(createError(400, 'Provide card ID'));

  // TODO: look up andrew ID from card ID
  const andrewId = cardId;
  const guest = false;

  User.findById(andrewId, (err, user) => {
    if (err) return next(createError(500, err));
    if (!user) {
      const newUser = new User({ _id: andrewId, guest });
      newUser.save((saveErr) => {
        if (err) return next(createError(500, saveErr));
        req.andrewUser = newUser;
        if (!guest) {
          emailer(andrewId, 'join', { andrewId });
        }
        next();
      });
    } else {
      req.andrewUser = user;
      next();
    }
  });
}

// middleware to get an open lease by user and umbrella (after getCreateUser)
function getSomeLease(req, res, next) {
  if (!req.andrewUser) return next(createError(500, 'User not fetched'));

  const andrewId = req.andrewUser._id;
  if (!andrewId) return next(createError(400, 'Provide Andrew ID'));

  const { id } = req.params;
  if (!id) return next(createError(400, 'Provide umbrella ID'));

  Lease.findOne({
    is_open: true,
    $or: [{ user: andrewId }, { umbrella: id }],
  }, (err, lease) => {
    if (err) return next(createError(500, err));
    req.openLease = lease;
    next();
  });
}

// middleware to get an open lease for an umbrella
function getUmbLease(req, res, next) {
  const { id } = req.params;
  if (!id) return next(createError(400, 'Provide umbrella ID'));

  Lease.findOne({ is_open: true, umbrella: id }, (err, lease) => {
    if (err) return next(createError(500, err));
    req.openLease = lease;
    next();
  });
}

module.exports = {
  getUmb, getCreateUser, getSomeLease, getUmbLease,
};
