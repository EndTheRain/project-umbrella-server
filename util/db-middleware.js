const createError = require('http-errors');
const { Dispenser, User } = require('./../models');

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

module.exports = { getDisp, getUmb, getCreateUser };
