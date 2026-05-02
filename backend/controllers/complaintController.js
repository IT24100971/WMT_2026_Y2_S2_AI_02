const Complaint = require('../models/Complaint');

// 1. CREATE
const createComplaint = async (req, res) => {
  try {
    const { title, description, proofImage } = req.body;
    const userId = req.user._id || req.user.id;

    const complaint = await Complaint.create({
      title,
      description,
      proofImage,
      raisedBy: userId 
    });
    res.status(201).json(complaint);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 2. READ
const getAllComplaints = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin') {
      query = { raisedBy: req.user._id || req.user.id };
    }
    const complaints = await Complaint.find(query).populate('raisedBy', 'fullName email');
    res.status(200).json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. UPDATE (Handles both Admin Status updates & User Content edits)
const updateComplaint = async (req, res) => {
  try {
    const { status, title, description, proofImage } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const userId = req.user._id || req.user.id;

    // SECURITY: If not an Admin, user must own the complaint to edit it
    if (req.user.role !== 'Admin' && complaint.raisedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own complaints.' });
    }

    // Admin Flow: Updating Status
    if (status && status !== complaint.status) {
      if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Only Admins can change status' });
      
      const flow = { 'Open': 1, 'In Progress': 2, 'Resolved': 3 };
      if (flow[status] <= flow[complaint.status]) {
        return res.status(400).json({ message: 'Status must move forward' });
      }
      if (status === 'Resolved') complaint.resolvedAt = new Date();
      complaint.status = status;
    }

    // Content Flow: Updating Text or Image
    const isTitleChanged = title && title !== complaint.title;
    const isDescChanged = description && description !== complaint.description;
    const isImageChanged = proofImage && proofImage !== complaint.proofImage;

    if (isTitleChanged || isDescChanged || isImageChanged) {
      if (complaint.status !== 'Open') {
        return res.status(400).json({ message: 'Cannot edit once processing has started.' });
      }
      if (title) complaint.title = title;
      if (description) complaint.description = description;
      if (proofImage) complaint.proofImage = proofImage;
    }

    const updated = await complaint.save();
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 4. DELETE
const deleteComplaint = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    await Complaint.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createComplaint, getAllComplaints, updateComplaint, deleteComplaint };