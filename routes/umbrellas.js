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

/* POST add a new umbrella to the dispenser (must be admin) */
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

/* POST borrow an umbrella from a dispenser (must provide andrewId) */
router.post('/:umbId/borrow', auth.authorizer, [
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

    if (req.andrewUser.settings.borrow_emails) {
      emailer.send({
        template: 'borrow',
        message: {
          to: `${andrewId}@andrew.cmu.edu`,
        },
        locals: {
          andrew_id: andrewId,
          umb_id: umbId,
          borrow_location: req.disp.name,
        },
      }).then().catch();
    }

    const reminderAt = req.andrewUser.settings.reminder_emails;
    if (reminderAt) {
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

/* POST return an umbrella to a dispenser (must provide returnAt) */
router.post('/:umbId/return', auth.authorizer, [
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

        if (andrewUser.settings.return_emails) {
          emailer.send({
            template: 'return',
            message: {
              to: `${andrewId}@andrew.cmu.edu`,
            },
            locals: {
              andrew_id: andrewId,
              umb_id: umbId,
              borrow_location: dispId,
            },
          }).then().catch();
        }

        return res.send(`Umbrella ${req.umb._id} from ${andrewId}`);
      });
    });
  });
});

module.exports = router;