const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Equipment', 'Cleanliness', 'Supplier', 'Staff', 'Other'], required: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  isAnonymous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  evidenceImage: { type: String },  // Evidence photo upload
  editedAt: { type: Date },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  history: [
    {
      from: { type: String },
      to: { type: String },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String },
      at: { type: Date, default: Date.now },
      note: { type: String }
    }
  ]
});

module.exports = mongoose.model('Complaint', complaintSchema);