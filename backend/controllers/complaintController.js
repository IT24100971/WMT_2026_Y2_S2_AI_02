const Complaint = require('../models/Complaint');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/evidence/',
  filename: (req, file, cb) => {
    cb(null, 'evidence-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage }).single('evidenceImage');

const createComplaint = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    try {
      const complaintData = {
        ...req.body,
        raisedBy: req.user.id
      };
      if (req.file) complaintData.evidenceImage = req.file.path;
      
      const complaint = await Complaint.create(complaintData);
      res.status(201).json(complaint);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const getComplaints = async (req, res) => {
  try {
    const { status, category } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    const complaints = await Complaint.find(filter)
      .populate('raisedBy', 'fullName email')
      .populate('assignedTo', 'fullName email');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('raisedBy', 'fullName email')
      .populate('assignedTo', 'fullName email');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    
    if (status === 'Resolved' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only Admin can mark as Resolved' });
    }
    
    const updateData = { status };
    if (status === 'Resolved') updateData.resolvedAt = Date.now();
    
    const updated = await Complaint.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: 'Complaint deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createComplaint, getComplaints, getComplaintById, updateComplaintStatus, deleteComplaint };