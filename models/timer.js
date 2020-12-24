const mongoose = require('mongoose');

const Timer = mongoose.model('Timer', {
  userId: Number,
  createdAt: Date,
  time: String,
  isSuccessful: { type: String, default: 'Нет' },
});

module.exports = Timer;
