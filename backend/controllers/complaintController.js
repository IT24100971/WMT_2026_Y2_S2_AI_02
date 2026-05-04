const Complaint = require('../models/Complaint');
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Try to configure Cloudinary if credentials exist
let storage;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'sunrise-supermarket/complaints',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    },
  });
} else {
  // Fallback to local storage if Cloudinary credentials are not available
  console.warn('⚠️  Cloudinary credentials not configured in complaint controller. Using local storage.');
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueName + path.extname(file.originalname));
    },
  });
}

const uploadMiddleware = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    } else {
      cb(null, true);
    }
  }
}).single('evidenceImage');

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
};

const createComplaint = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error('Multer/Cloudinary Upload Error:', err);
      return res.status(400).json({ 
        message: `Image upload failed: ${err.message}. Please ensure the image is valid and try again.` 
      });
    }

    try {
      const complaintData = {
        ...req.body,
        raisedBy: req.user.id
      };
      if (typeof req.body.isAnonymous !== 'undefined') {
        complaintData.isAnonymous = toBoolean(req.body.isAnonymous);
      }
      if (req.file) {
        complaintData.evidenceImage = req.file.path;
      }

      const complaint = await Complaint.create(complaintData);
      res.status(201).json(complaint);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const getComplaints = async (req, res) => {
  try {
    const { status, category, date } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (date) {
      const start = new Date(date + 'T00:00:00.000Z');
      const end = new Date(date + 'T23:59:59.999Z');
      filter.createdAt = { $gte: start, $lte: end };
    }

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
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (status === 'Resolved') {
      const allowed = req.user.role === 'Admin' || req.user.role === 'Supervisor' || String(complaint.raisedBy) === String(req.user.id);
      if (!allowed) return res.status(403).json({ message: 'Not authorized to mark Resolved' });
    }

    const prev = complaint.status;
    complaint.status = status;
    if (status === 'Resolved') complaint.resolvedAt = Date.now();

    complaint.history = complaint.history || [];
    complaint.history.push({ from: prev, to: status, by: req.user.id, role: req.user.role, at: Date.now() });

    const updated = await complaint.save();
    const populated = await Complaint.findById(updated._id).populate('raisedBy', 'fullName email').populate('assignedTo', 'fullName email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editComplaintDetails = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    try {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
      if (String(complaint.raisedBy) !== String(req.user.id)) return res.status(403).json({ message: 'Only the worker who raised the complaint can edit it' });

      const { title, description, category, status, isAnonymous } = req.body;
      if (title) complaint.title = title;
      if (description) complaint.description = description;
      if (category) complaint.category = category;
      if (status && complaint.status !== status) {
        const prevStatus = complaint.status;
        complaint.status = status;
        complaint.history = complaint.history || [];
        complaint.history.push({ from: prevStatus, to: status, by: req.user.id, role: req.user.role, at: Date.now(), note: 'Status updated in edit' });
        if (status === 'Resolved') complaint.resolvedAt = Date.now();
      }
      if (typeof isAnonymous !== 'undefined') {
        complaint.isAnonymous = toBoolean(isAnonymous);
      }
      if (req.file) complaint.evidenceImage = req.file.path;
      complaint.editedAt = Date.now();
      complaint.editedBy = req.user.id;

      complaint.history = complaint.history || [];
      complaint.history.push({ from: 'Edited', to: 'Edited', by: req.user.id, role: req.user.role, at: Date.now(), note: 'Details edited' });

      const updated = await complaint.save();
      const populated = await Complaint.findById(updated._id).populate('raisedBy', 'fullName email').populate('assignedTo', 'fullName email');
      res.json(populated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (String(complaint.raisedBy) === String(req.user.id)) {
      await Complaint.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Complaint deleted by owner' });
    }

    if (req.user.role === 'Admin' || req.user.role === 'Supervisor') {
      const history = complaint.history || [];
      const workerResolved = history.some(h => h.to === 'Resolved' && String(h.by) === String(complaint.raisedBy));
      const adminResolved = history.some(h => h.to === 'Resolved' && (h.role === 'Admin' || h.role === 'Supervisor'));
      if (workerResolved && adminResolved) {
        await Complaint.findByIdAndDelete(req.params.id);
        return res.json({ message: 'Complaint deleted by admin/supervisor' });
      }
      return res.status(403).json({ message: 'Admin/Supervisor can delete only after both worker and admin have marked Resolved' });
    }

    return res.status(403).json({ message: 'Not authorized to delete complaint' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createComplaint, getComplaints, getComplaintById, updateComplaintStatus, editComplaintDetails, deleteComplaint };