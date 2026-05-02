const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // Assume group auth is here
const { createComplaint, getAllComplaints, updateComplaint, deleteComplaint } = require('../controllers/complaintController');

router.get('/', protect, getAllComplaints);
router.post('/', protect, createComplaint);
router.put('/:id', protect, updateComplaint);
router.delete('/:id', protect, deleteComplaint);

module.exports = router;