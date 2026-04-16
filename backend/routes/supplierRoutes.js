const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { createSupplier, getSuppliers, getSupplierById, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const router = express.Router();

router.post('/', protect, adminOnly, createSupplier);
router.get('/', protect, getSuppliers);
router.get('/:id', protect, getSupplierById);
router.put('/:id', protect, adminOnly, updateSupplier);
router.delete('/:id', protect, adminOnly, deleteSupplier);

module.exports = router;