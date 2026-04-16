const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  shiftType: { type: String, enum: ['Morning', 'Evening', 'Night'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  status: { type: String, enum: ['Scheduled', 'Completed', 'Absent'], default: 'Scheduled' },
  notes: { type: String },
  attendanceReport: { type: String }  // PDF report upload
});

module.exports = mongoose.model('Shift', shiftSchema);