const express = require('express');
const { protect } = require('../middleware/auth');
const { createInventory, getInventory, getInventoryById, updateStock, deleteInventory } = require('../controllers/inventoryController');
const router = express.Router();

router.post('/', protect, createInventory);
router.get('/', protect, getInventory);
router.get('/:id', protect, getInventoryById);
router.put('/:id', protect, updateStock);
router.delete('/:id', protect, deleteInventory);

module.exports = router;