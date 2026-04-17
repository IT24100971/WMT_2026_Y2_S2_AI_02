// productController.js
// Contains all business logic for Product CRUD operations.
// Each function handles one HTTP operation. We import the shared upload
// middleware so we don't duplicate the multer config that already exists.

const Product = require('../models/Product');
const upload = require('../middleware/upload');

// ─────────────────────────────────────────────────────────
// CREATE — POST /api/products
// Uses the shared upload middleware to handle the image file.
// We wrap the controller in upload() because multer must run first
// to parse the multipart form data before we can read req.body.
// ─────────────────────────────────────────────────────────
const createProduct = (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const { name, category, barcode, unit, sellingPrice, costPrice, description } = req.body;

      // Validate required fields manually for clear error messages
      if (!name || !category || !barcode || !unit || !sellingPrice || !costPrice) {
        return res.status(400).json({ message: 'Please fill all required fields' });
      }

      // Validate prices are valid numbers
      if (isNaN(Number(sellingPrice)) || isNaN(Number(costPrice))) {
        return res.status(400).json({ message: 'Prices must be valid numbers' });
      }

      // Business Logic: check duplicate barcode before saving
      // This gives a clean error message instead of MongoDB's generic duplicate key error
      const existingProduct = await Product.findOne({ barcode });
      if (existingProduct) {
        return res.status(400).json({ message: 'A product with this barcode already exists' });
      }

      const product = await Product.create({
        name,
        category,
        barcode,
        unit,
        sellingPrice: Number(sellingPrice),
        costPrice: Number(costPrice),
        description,
        // req.file is set by multer if an image was uploaded.
        // req.file.path will be something like "uploads/1712345678-product.jpg"
        image: req.file ? req.file.path : null,
      });

      res.status(201).json(product); // 201 = Created
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
};

// ─────────────────────────────────────────────────────────
// GET ALL — GET /api/products  OR  GET /api/products?category=Rice
// Supports optional category filter via query parameter.
// ─────────────────────────────────────────────────────────
const getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;
    // If ?category=Rice is in the URL, filter by it. Otherwise return all.
    const filter = category ? { category } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 }); // newest first
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
// GET ONE — GET /api/products/:id
// ─────────────────────────────────────────────────────────
const getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
// UPDATE — PUT /api/products/:id
// Wraps upload() to allow optional image re-upload.
// ─────────────────────────────────────────────────────────
const updateProduct = (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const updateData = { ...req.body };

      // Convert price strings to numbers if they were sent
      if (req.body.sellingPrice) updateData.sellingPrice = Number(req.body.sellingPrice);
      if (req.body.costPrice) updateData.costPrice = Number(req.body.costPrice);

      // Only update image if a new one was uploaded
      if (req.file) updateData.image = req.file.path;

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
        // new: true → returns the updated document
        // runValidators: true → re-runs schema validations on updated fields
      );

      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.status(200).json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
};

// ─────────────────────────────────────────────────────────
// DELETE — DELETE /api/products/:id
// ─────────────────────────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProduct, getAllProducts, getSingleProduct, updateProduct, deleteProduct };