const Shift = require('../models/Shift');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/shifts/',
  filename: (req, file, cb) => {
    cb(null, 'attendancereport-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage }).single('attendanceReport');

const createShift = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    try {
      const user = await User.findById(req.body.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      const shiftData = { ...req.body };
      if (req.file) shiftData.attendanceReport = req.file.path;
      
      const shift = await Shift.create(shiftData);
      res.status(201).json(shift);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const getShifts = async (req, res) => {
  try {
    const { date, userId } = req.query;
    let filter = {};
    if (date) filter.date = new Date(date);
    if (userId) filter.userId = userId;
    
    const shifts = await Shift.find(filter).populate('userId', 'fullName email role');
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id).populate('userId');
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    res.json(shift);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateShift = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    try {
      const updateData = { ...req.body };
      if (req.file) updateData.attendanceReport = req.file.path;
      
      const shift = await Shift.findByIdAndUpdate(req.params.id, updateData, { new: true });
      res.json(shift);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const deleteShift = async (req, res) => {
  try {
    await Shift.findByIdAndDelete(req.params.id);
    res.json({ message: 'Shift deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createShift, getShifts, getShiftById, updateShift, deleteShift };