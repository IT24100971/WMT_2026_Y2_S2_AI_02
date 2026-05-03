const express = require('express');
const { protect } = require('../middleware/auth');
const { createInventory, getInventory, getInventoryById, updateStock, updateInventory, deleteInventory } = require('../controllers/inventoryController');
const router = express.Router();

router.post('/', protect, createInventory);
router.get('/', protect, getInventory);
router.get('/:id', protect, getInventoryById);
router.put('/:id/stock', protect, updateStock);
router.put('/:id', protect, updateInventory);
router.delete('/:id', protect, deleteInventory);

module.exports = router;