const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierName: { type: String, required: true },
  contactNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  productsSupplied: [{ type: String }],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  contractDocument: { type: String }  // Contract PDF upload
});

module.exports = mongoose.model('Supplier', supplierSchema);