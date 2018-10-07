const path = require('path');
const nodemailer = require('nodemailer');
const Email = require('email-templates');

const transport = nodemailer.createTransport('SMTP', {
  service: 'Gmail',
  auth: {
    user: process.env.MAILER_EMAIL,
    pass: process.env.MAILER_PASSWORD,
  },
});

const email = new Email({
  views: {
    root: path.resolve('./../emails/'),
    options: {
      extension: 'hbs',
    },
  },
  message: {
    from: process.env.MAILER_ENV,
  },
  transport,
});

module.exports = email;