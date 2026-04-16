const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  currentStock: { type: Number, required: true, default: 0 },
  reorderLevel: { type: Number, required: true },
  maxStock: { type: Number, required: true },
  expiryDate: { type: Date },
  lastRestockedDate: { type: Date, default: Date.now },
  warehouseLocation: { type: String },
  stockReport: { type: String }  // PDF report upload
});

inventorySchema.virtual('stockStatus').get(function() {
  if (this.currentStock <= 0) return 'Out of Stock';
  if (this.currentStock < this.reorderLevel) return 'Low Stock';
  return 'In Stock';
});

module.exports = mongoose.model('Inventory', inventorySchema);