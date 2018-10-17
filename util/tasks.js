const { Lease, Task, User } = require('./../models');
const emailer = require('./emailer');

// do a task and remove it from db
function exec(id) {
  Task.findById(id, (err, task) => {
    if (err) return;
    if (task.type === 'email_reminder') {
      Lease.findOne({ _id: task.lease, is_open: true }, (leaseErr, lease) => {
        if (leaseErr || !lease) return;
        User.findById(lease.user, (userErr, user) => {
          if (userErr || !user) return;
          const andrewId = user._id;
          emailer.send({
            template: 'return',
            message: {
              to: `${andrewId}@andrew.cmu.edu`,
            },
            locals: {
              andrew_id: andrewId,
              umb_id: lease.umbrella,
              expiry: lease.expiry,
            },
          }).then().catch();
        });
      });
    }
    Task.remove({ _id: id }).exec();
  });
}

// schedule a task with settimeout
function schedule(id) {
  Task.findById(id, (err, task) => {
    if (!err) setTimeout(() => exec(id), task.execute_at - Date.now());
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
    setTimeout(() => exec(id), savedTask.execute_at - Date.now());
    callback(null);
  });
}

module.exports = {
  add,
  schedule,
  exec,
};
