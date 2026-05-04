const express = require('express');
const { protect, allowRoles } = require('../middleware/auth');
const {
  createGRN,
  getGRNs,
  getGRNById,
  updateGRN,
  deleteGRN,
  getGRNsBySupplier,
  getGRNStatistics,
  applyGRNToInventory
} = require('../controllers/grnController');
const { markGRNAsRead } = require('../controllers/grnController');

const router = express.Router();

router.post('/', protect, createGRN);
router.get('/', protect, getGRNs);
router.get('/statistics', protect, getGRNStatistics);
router.get('/supplier/:supplierId', protect, getGRNsBySupplier);
router.get('/:id', protect, getGRNById);
router.put('/:id', protect, updateGRN);
router.put('/:id/mark-read', protect, allowRoles('Admin', 'Supervisor'), markGRNAsRead);
router.post('/:id/apply-to-inventory', protect, allowRoles('Admin', 'Supervisor'), applyGRNToInventory);
router.delete('/:id', protect, deleteGRN);

module.exports = router;