const bcrypt = require('bcrypt');
const auth = require('basic-auth');
const createError = require('http-errors');
const { Dispenser } = require('./../models');
const { salts } = require('./../config.json');

// auth middleware for dispensers
function authorizer(req, res, next) {
  const credentials = auth(req);
  if (!credentials) return next(createError(403, 'No credentials'));
  Dispenser.findOne({ _id: credentials.name, status: true }, (err, disp) => {
    if (err) return next(createError(500, err));
    if (!disp) return next(createError(403, 'Dispenser not found'));
    bcrypt.compare(credentials.pass, disp.key, (compErr, result) => {
      if (compErr) return next(createError(500, compErr));
      if (!result) return next(createError(403, 'Invalid credentials'));
      req.disp = disp;
      next();
    });
  });
}

// auth middleware for the admin
function adminizer(req, res, next) {
  const credentials = auth(req);
  if (!credentials) return next(createError(403, 'No credentials'));
  if (credentials.name !== 'admin') return next(createError(403, 'Wrong name'));
  bcrypt.compare(credentials.pass, process.env.ADMIN_KEY, (err, result) => {
    if (err) return next(createError(500, err));
    if (!result) return next(createError(403, 'Invalid credentials'));
    next();
  });
}

// hashes a new user's key
function hash(username, key, callback) {
  bcrypt.hash(key, salts, callback);
}

module.exports = { authorizer, adminizer, hash };
