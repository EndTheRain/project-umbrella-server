const createError = require('http-errors');
const express = require('express');
const hbs = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const sassMiddleware = require('node-sass-middleware');
const mongoose = require('mongoose');

const indexRouter = require('./routes/index');
const dispensersRouter = require('./routes/dispensers');
const umbrellasRouter = require('./routes/umbrellas');

const app = express();

// view engine setup
app.engine('hbs', hbs({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '/views/layouts/'),
  partialsDir: path.join(__dirname, '/views/partials/'),
}));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public/'),
  dest: path.join(__dirname, 'public/'),
  indentedSyntax: true,
  outputStyle: 'compressed',
  sourceMap: true,
}));
app.use(express.static(path.join(__dirname, 'public')));

// connect to db
mongoose.connect('mongodb://localhost/pup');

// TODO: email reminder system + persistence for this

app.use('/', indexRouter);
app.use('/dispensers', dispensersRouter);
app.use('/umbrellas', umbrellasRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
