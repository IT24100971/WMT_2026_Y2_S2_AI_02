const express = require('express');
const { protect, adminOnly, allowRoles } = require('../middleware/auth');
const { 
  createShift, 
  getShifts, 
  getShiftById, 
  updateShift, 
  updateMemberShiftResponse,
  deleteShift,
  uploadAttendanceReport,
  getShiftStats
} = require('../controllers/shiftController');
const router = express.Router();

// CRUD operations
router.post('/', protect, allowRoles('Admin', 'Supervisor'), createShift);
router.get('/', protect, getShifts);
router.get('/stats/summary', protect, allowRoles('Admin', 'Supervisor'), getShiftStats);
router.get('/:id', protect, getShiftById);
router.put('/:id', protect, allowRoles('Admin', 'Supervisor'), updateShift);
router.patch('/:id/member-response', protect, updateMemberShiftResponse);
router.delete('/:id', protect, adminOnly, deleteShift);

// Upload attendance report (PATCH endpoint - +1 requirement)
router.patch('/:id/report', protect, allowRoles('Admin', 'Supervisor'), uploadAttendanceReport);

module.exports = router;
