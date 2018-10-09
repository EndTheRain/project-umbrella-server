const express = require('express');
const auth = require('express-basic-auth');
const createError = require('http-errors');
const config = require('./../config.json');
const { getDisp, getUmb, getCreateUser } = require('./../util/db-middleware');
const emailer = require('./../util/emailer');
const tasks = require('./../util/tasks');
const { Dispenser } = require('./../models');

const router = express.Router();

/* POST add a new dispenser to the network (must be admin) */
router.post('/add', auth(config.auth), (req, res, next) => {
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
router.post('/:id/umbrellas/add', auth(config.auth), [
  getDisp,
], (req, res, next) => {
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
router.post('/:id/umbrellas/:umbId/borrow', auth(config.auth), [
  getDisp, getUmb, getCreateUser,
], (req, res, next) => {
  if (req.umb.borrower) next(createError(409, 'Umbrella in use'));

  const andrewId = req.andrewUser._id;
  const borrowedAt = Date.now();
  req.umb.borrower = andrewId;
  req.umb.borrowed_at = borrowedAt;
  req.disp.save((err) => {
    if (err) return next(createError(500, err));

    if (req.andrewUser.settings.borrow_emails) {
      emailer.send({
        template: 'borrow',
        message: {
          to: `${andrewId}@andrew.cmu.edu`,
        },
        locals: {
          umb_id: req.umb._id,
          borrow_location: req.disp.name,
        },
      }).then().catch();
    }

    const strikeAt = borrowedAt + config.duration;
    tasks.add('strike', {
      user: andrewId,
      dispenser: req.disp._id,
      umbrella: req.umb._id,
      expiry: strikeAt,
    }, (strikeTaskErr) => {
      if (strikeTaskErr) return next(createError(500, err));

      const reminderAt = req.andrewUser.settings.reminder_emails;
      if (reminderAt) {
        const remindAt = strikeAt - reminderAt;
        tasks.add('email_reminder', {
          user: andrewId,
          dispenser: req.disp._id,
          umbrella: req.umb._id,
          expiry: remindAt,
        }, (emailTaskErr) => {
          if (emailTaskErr) return next(createError(500, err));
          return res.send(`Umbrella ${req.umb._id} borrowed by ${andrewId} (will remind)`);
        });
      } else {
        return res.send(`Umbrella ${req.umb._id} borrowed by ${andrewId}`);
      }
    });
  });
});

/* POST return an umbrella to a dispenser */
router.post('/:id/umbrellas/:umbId/return', auth(config.auth), [
  getDisp, getUmb, getCreateUser,
], (req, res, next) => {
  const { returnedDate } = req.query;
  const andrewId = req.andrewUser._id;
  if (!returnedDate) return next(createError(400, 'Provide datetime'));
  if (!req.umb.borrower) return next(createError(409, 'Umbrella not out'));
  if (req.umb.borrower !== andrewId) {
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

      if (req.andrewUser.settings.return_emails) {
        emailer.send({
          template: 'return',
          message: {
            to: `${andrewId}@andrew.cmu.edu`,
          },
          locals: {
            umb_id: req.umb._id,
            borrow_location: req.disp._id,
          },
        }).then().catch();
      }

      return res.send(`Umbrella ${req.umb._id} returned by ${andrewId}`);
    });
  });
});

module.exports = router;
