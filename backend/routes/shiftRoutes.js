const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { createShift, getShifts, getShiftById, updateShift, deleteShift } = require('../controllers/shiftController');
const router = express.Router();

router.post('/', protect, adminOnly, createShift);
router.get('/', protect, getShifts);
router.get('/:id', protect, getShiftById);
router.put('/:id', protect, adminOnly, updateShift);
router.delete('/:id', protect, adminOnly, deleteShift);

module.exports = router;