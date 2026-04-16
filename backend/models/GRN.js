const mongoose = require('mongoose');

const grnSchema = new mongoose.Schema({
  grnNumber: { type: String, required: true, unique: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  invoicedQty: { type: Number, required: true },
  receivedQty: { type: Number, required: true },
  condition: { type: String, enum: ['Good', 'Damaged', 'Rejected'], default: 'Good' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receivedDate: { type: Date, default: Date.now },
  image: { type: String }
});

grnSchema.virtual('shipmentStatus').get(function() {
  if (this.receivedQty < this.invoicedQty) return 'Short Shipment';
  return 'Complete';
});

module.exports = mongoose.model('GRN', grnSchema);