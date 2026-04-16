const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createGRN,
  getGRNs,
  getGRNById,
  updateGRN,
  deleteGRN,
  getGRNsBySupplier,
  getGRNStatistics
} = require('../controllers/grnController');

const router = express.Router();

router.post('/', protect, createGRN);
router.get('/', protect, getGRNs);
router.get('/statistics', protect, getGRNStatistics);
router.get('/supplier/:supplierId', protect, getGRNsBySupplier);
router.get('/:id', protect, getGRNById);
router.put('/:id', protect, updateGRN);
router.delete('/:id', protect, deleteGRN);

module.exports = router;