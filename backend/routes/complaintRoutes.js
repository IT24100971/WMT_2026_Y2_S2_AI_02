const express = require('express');
const { protect } = require('../middleware/auth');
const { createComplaint, getComplaints, getComplaintById, updateComplaintStatus, deleteComplaint, editComplaintDetails } = require('../controllers/complaintController');
const router = express.Router();

router.post('/', protect, createComplaint);
router.get('/', protect, getComplaints);
router.get('/:id', protect, getComplaintById);
router.put('/:id/status', protect, updateComplaintStatus);
router.put('/:id', protect, editComplaintDetails);
router.delete('/:id', protect, deleteComplaint);

module.exports = router;