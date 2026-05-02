const Shift = require('../models/Shift');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MANAGER_ROLES = ['Admin', 'Supervisor'];

const storage = multer.diskStorage({
  destination: './uploads/shifts/',
  filename: (req, file, cb) => {
    cb(null, 'attendance-' + Date.now() + path.extname(file.originalname));
  }
});
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter }).single('attendanceReport');

const normalizeFilePath = (filePath) => (filePath ? filePath.replace(/\\/g, '/') : filePath);
const canManageShifts = (role) => MANAGER_ROLES.includes(role);

const createShift = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    try {
      const user = await User.findById(req.body.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      const shiftData = { ...req.body };
      // validate date/time business rules
      const validation = validateShiftData(shiftData);
      if (!validation.valid) return res.status(400).json({ message: validation.message });

      if (req.file) {
        shiftData.attendanceReport = normalizeFilePath(req.file.path);
        shiftData.attendanceReportOriginalName = req.file.originalname;
        shiftData.attendanceReportMimeType = req.file.mimetype;
      }
      
      const shift = await Shift.create(shiftData);
      const populatedShift = await Shift.findById(shift._id).populate('userId', 'fullName email role avatar');
      res.status(201).json(populatedShift);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};


const getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id).populate('userId');
    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    const isOwner = shift.userId && shift.userId._id && shift.userId._id.toString() === req.user.id;
    if (!canManageShifts(req.user.role) && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

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
      // validate date/time business rules on update as well
      const validation = validateShiftData(updateData, true);
      if (!validation.valid) return res.status(400).json({ message: validation.message });
      if (req.file) {
        updateData.attendanceReport = normalizeFilePath(req.file.path);
        updateData.attendanceReportOriginalName = req.file.originalname;
        updateData.attendanceReportMimeType = req.file.mimetype;
      }
      
      const shift = await Shift.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('userId', 'fullName email role avatar');
      if (!shift) return res.status(404).json({ message: 'Shift not found' });
      res.json(shift);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const updateMemberShiftResponse = async (req, res) => {
  try {
    const { employeeStatus, employeeStatusReason } = req.body;
    if (!['Will Attend', 'Unable to Attend'].includes(employeeStatus)) {
      return res.status(400).json({ message: 'Invalid status. Use Will Attend or Unable to Attend' });
    }

    if (employeeStatus === 'Unable to Attend' && !employeeStatusReason?.trim()) {
      return res.status(400).json({ message: 'Reason is required when unable to attend' });
    }

    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    if (shift.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own shift response' });
    }

    shift.employeeStatus = employeeStatus;
    shift.employeeStatusReason = employeeStatus === 'Unable to Attend' ? employeeStatusReason : '';
    shift.employeeRespondedAt = new Date();
    await shift.save();

    const updatedShift = await Shift.findById(shift._id).populate('userId', 'fullName email role avatar');
    res.json(updatedShift);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteShift = async (req, res) => {
  try {
    console.log('Delete requested by user:', req.user);
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    // remove attendance file if present
    if (shift.attendanceReport) {
      try {
        if (fs.existsSync(shift.attendanceReport)) {
          fs.unlinkSync(shift.attendanceReport);
        }
      } catch (err) {
        console.error('Failed to delete attendance file:', err.message);
      }
    }

    await Shift.findByIdAndDelete(req.params.id);
    res.json({ message: 'Shift deleted' });
  } catch (error) {
    console.error('Error in deleteShift:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add this to shiftController.js (above module.exports)

const uploadAttendanceReport = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const shift = await Shift.findByIdAndUpdate(
        req.params.id,
        {
          attendanceReport: normalizeFilePath(req.file.path),
          attendanceReportOriginalName: req.file.originalname,
          attendanceReportMimeType: req.file.mimetype
        },
        { new: true }
      ).populate('userId', 'fullName email role avatar');
      
      if (!shift) {
        return res.status(404).json({ message: 'Shift not found' });
      }
      
      res.json({ 
        message: 'Attendance document uploaded successfully', 
        shift 
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const getShiftStats = async (req, res) => {
  try {
    const totalShifts = await Shift.countDocuments();
    const completedShifts = await Shift.countDocuments({ status: 'Completed' });
    const absentShifts = await Shift.countDocuments({ status: 'Absent' });
    const scheduledShifts = await Shift.countDocuments({ status: 'Scheduled' });
    
    res.json({
      total: totalShifts,
      completed: completedShifts,
      absent: absentShifts,
      scheduled: scheduledShifts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ALSO fix getShifts to respect role-based access
const getShifts = async (req, res) => {
  try {
    const { date, userId } = req.query;
    let filter = {};
    
    // Role-based filtering
    if (!canManageShifts(req.user.role)) {
      // Staff users see only their own shifts
      filter.userId = req.user.id;
    } else {
      // Admin/Supervisor can filter by specific user
      if (userId) filter.userId = userId;
    }
    
    if (date) filter.date = new Date(date);
    
    const shifts = await Shift.find(filter).populate('userId', 'fullName email role avatar');
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// At the bottom of shiftController.js
module.exports = { 
  createShift, 
  getShifts, 
  getShiftById, 
  updateShift, 
  updateMemberShiftResponse,
  deleteShift,
  uploadAttendanceReport,
  getShiftStats
};

// Helper: validate incoming shift date/time
function validateShiftData(data, isUpdate = false) {
  try {
    const { date, startTime, endTime } = data;
    if (!date) return { valid: false, message: 'Date is required' };

    const shiftDate = new Date(date);
    // clear time portion for comparison
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (shiftDate < todayStart) {
      return { valid: false, message: 'Shift date cannot be in the past' };
    }

    if (!startTime || !endTime) return { valid: false, message: 'Start time and end time are required' };

    // parse HH:MM
    const parse = (t) => {
      const parts = String(t).split(':');
      const hh = parseInt(parts[0] || '0', 10);
      const mm = parseInt(parts[1] || '0', 10);
      return { hh, mm };
    };

    const s = parse(startTime);
    const e = parse(endTime);
    const startDt = new Date(shiftDate);
    startDt.setHours(s.hh, s.mm, 0, 0);
    const endDt = new Date(shiftDate);
    endDt.setHours(e.hh, e.mm, 0, 0);

    if (endDt <= startDt) return { valid: false, message: 'End time must be after start time' };

    // If shift is today, ensure start time is not before now
    const now = new Date();
    const isSameDay = shiftDate.getFullYear() === now.getFullYear() && shiftDate.getMonth() === now.getMonth() && shiftDate.getDate() === now.getDate();
    if (isSameDay && startDt < now) {
      return { valid: false, message: 'Start time cannot be earlier than now for today' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, message: 'Invalid date/time format' };
  }
}