const { Dispenser, Task, User } = require('./../models');

// do a task and remove it from db
function exec(id) {
  Task.findById(id, (err, { type, user }) => {
    if (err) return;
    if (type === 'email_reminder') {
      // TODO: send an email reminder

    } else if (type === 'strike') {
      // TODO: check if user has returned umbrella, if not strike++
    }
    Task.remove({ _id: id }).exec();
  });
}

// schedule a task with settimeout
function schedule(id) {
  Task.findById(id, (err, task) => {
    if (!err) setTimeout(() => exec(id), task.expiry - Date.now());
  });
}

// create a new task in db and schedule
function add(type, options, callback) {
  const task = new Task({
    type, ...options,
  });
  task.save((err, savedTask) => {
    if (err) return callback(err);
    const id = savedTask._id;
    schedule(id);
    callback(null);
  });
}

module.exports = {
  add,
  exec,
};
