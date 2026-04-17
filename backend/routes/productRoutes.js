// productRoutes.js
// Maps URL paths + HTTP methods to controller functions.
// Uses protect (must be logged in) and adminOnly (must be Admin role)


const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// GET /api/products          → get all products (logged in users only)
// POST /api/products         → create product (Admin only)
router.route('/')
  .get(protect, getAllProducts)
  .post(protect, adminOnly, createProduct);

// GET /api/products/:id      → get one product
// PUT /api/products/:id      → update product (Admin only)
// DELETE /api/products/:id   → delete product (Admin only)
router.route('/:id')
  .get(protect, getSingleProduct)
  .put(protect, adminOnly, updateProduct)
  .delete(protect, adminOnly, deleteProduct);

module.exports = router;