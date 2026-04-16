const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');

// Image upload configuration
const storage = multer.diskStorage({
  destination: './uploads/products/',
  filename: (req, file, cb) => {
    cb(null, 'product-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage }).single('productImage');

// Create product
const createProduct = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    try {
      const product = await Product.create({
        ...req.body,
        sellingPrice: Number(req.body.sellingPrice),
        costPrice: Number(req.body.costPrice),
        image: req.file ? req.file.path : null
      });
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

// Get all products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single product
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    try {
      const updateData = { ...req.body };
      if (req.file) updateData.image = req.file.path;
      const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};