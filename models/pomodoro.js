const mongoose = require('mongoose')

const Pomodoro = mongoose.model('Round', {
  userId: Number,
  work: Number,
  rest: Number,
  repeate: Number,
  createdAt: Date,
  isSuccessful: { type: String, default: 'Нет' },
});

module.exports = Pomodoro;
