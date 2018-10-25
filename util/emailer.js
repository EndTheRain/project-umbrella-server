const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const nodemailer = require('nodemailer');
const emails = require('./../emails.json');

const templates = {};
Object.keys(emails).forEach((filename) => {
  templates[filename] = fs.readFileSync(path.resolve(`emails/${filename}.hbs`));
});

const transport = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.MAILER_EMAIL,
    pass: process.env.MAILER_PASSWORD,
  },
});

function send(user, template, options, callback) {
  transport.sendMail({
    to: `${user}@andrew.cmu.edu`,
    from: process.env.MAILER_EMAIL,
    subject: emails[template],
    html: handlebars.compile(templates[template].toString())({ user, ...options }),
  }, (err) => {
    if (callback) callback(err);
  });
}

module.exports = send;
