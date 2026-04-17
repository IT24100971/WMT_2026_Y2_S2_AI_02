const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
  type: String, 
  enum: [
    'Rice', 'Oil', 'Dairy', 'Bakery', 'Beverage',
    'Flour', 'Sugar', 'Snacks', 'Grocery', 'Cleaning',
    'Personal Care', 'Frozen', 'Fruits & Veg', 'Condiments', 'Baby'
  ],
  required: true 
},
  barcode: { type: String, required: true, unique: true },
  unit: { type: String, enum: ['kg', 'L', 'pcs'], required: true },
  sellingPrice: { type: Number, required: true },
  costPrice: { type: Number, required: true },
  description: { type: String },
  image: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);