const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Admin', 'Cashier', 'Supervisor', 'Storekeeper'],
    default: 'Cashier'
  },
  avatar: { type: String },  // Profile photo upload
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);