const express = require('express');
const createError = require('http-errors');
const { duration } = require('./../config.json');
const auth = require('./../util/auth');
const {
  getUmb, getCreateUser, getSomeLease, getUmbLease,
} = require('./../util/db-middleware');
const emailer = require('./../util/emailer');
const tasks = require('./../util/tasks');
const {
  Dispenser, Umbrella, User, Lease,
} = require('./../models');

const router = express.Router();

/* POST add a new umbrella to the dispenser (ADMIN, provide umbId/dispId) */
router.post('/add', auth.adminizer, (req, res, next) => {
  const { umbId, dispId } = req.query;
  if (!umbId) return next(createError(400, 'Provide umbrella ID'));
  if (!dispId) return next(createError(400, 'Provide dispenser ID'));

  Dispenser.findById(dispId, (err, disp) => {
    if (err) return next(createError(500, err));
    if (!disp) return next(createError(404, 'Dispenser not found'));
    const umb = new Umbrella({ _id: umbId, dispenser: dispId });
    umb.save((umbErr) => {
      if (umbErr) return next(createError(500, umbErr));
      return res.status(201).send(`Added umbrella ${umbId}`);
    });
  });
});

/* POST make an umbrella (un)available for circulation (ADMIN) */
router.post('/:id/(|available|unavailable)', auth.adminizer, (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(createError(400, 'Provide umbrella ID'));

  Umbrella.findById(id, (err, umb) => {
    if (err) return next(createError(500, err));
    if (!umb) return next(createError(404, 'Umbrella not found'));

    const state = req.path.substring(req.path.lastIndexOf('/') + 1);
    umb.status = state === 'available'; // eslint-disable-line no-param-reassign
    umb.save((saveErr) => {
      if (saveErr) return next(createError(500, saveErr));
      return res.send(`Umbrella ${id} available ${umb.status}`);
    });
  });
});

/* POST borrow an umbrella from a dispenser (provide andrewId) */
router.post('/:id/borrow', auth.authorizer, [
  getUmb, getCreateUser, getSomeLease,
], (req, res, next) => {
  if (req.openLease) return next(createError(409, 'Lease already exists'));

  const andrewId = req.andrewUser._id;
  const dispId = req.disp._id;
  const umbId = req.umb._id;
  const borrowAt = Date.now();
  const expiry = borrowAt + duration;
  const umbLease = new Lease({
    user: andrewId,
    umbrella: umbId,
    borrow_dispenser: dispId,
    borrow_at: borrowAt,
    expiry,
  });
  umbLease.save((err, lease) => {
    if (err || !lease) return next(createError(500, err));

    if (!req.andrewUser.guest && req.andrewUser.settings.borrow_emails) {
      emailer(andrewId, 'borrow', {
        umb_id: umbId,
        borrow_location: req.disp.name,
      });
    }

    const reminderAt = req.andrewUser.settings.reminder_emails;
    if (!req.andrewUser.guest && reminderAt) {
      const remindAt = expiry - reminderAt;
      tasks.add('email_reminder', {
        user: andrewId,
        lease: lease._id,
        execute_at: remindAt,
      }, (emailTaskErr) => {
        if (emailTaskErr) return next(createError(500, err));
        return res.send(`Umbrella ${umbId} to ${andrewId} (will remind)`);
      });
    } else {
      return res.send(`Umbrella ${umbId} to ${andrewId}`);
    }
  });
});

/* POST return an umbrella to a dispenser (provide returnAt) */
router.post('/:id/return', auth.authorizer, [
  getUmb, getUmbLease,
], (req, res, next) => {
  if (!req.openLease) return next(createError(404, 'Lease not found'));

  const { returnAt } = req.query;
  if (!returnAt) return next(createError(400, 'Provide datetime'));
  const andrewId = req.openLease.user;
  const dispId = req.disp._id;
  const umbId = req.umb._id;


  User.findById(andrewId, (err, andrewUser) => {
    if (err) return next(createError(500, err));
    if (!andrewUser) return next(createError(404, 'Borrower not found'));

    req.openLease.is_open = false;
    req.openLease.return_dispenser = dispId;
    req.openLease.return_at = returnAt;

    req.openLease.save((leaseErr) => {
      if (leaseErr) return next(createError(500, leaseErr));
      req.umb.dispenser = dispId;
      req.umb.save((umbErr) => {
        if (umbErr) return next(createError(500, umbErr));

        if (!andrewUser.guest && andrewUser.settings.return_emails) {
          emailer(andrewId, 'return', {
            umb_id: umbId,
            borrow_location: dispId,
          });
        }

        return res.send(`Umbrella ${req.umb._id} from ${andrewId}`);
      });
    });
  });
});

module.exports = router;
