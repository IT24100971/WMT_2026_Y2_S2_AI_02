const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/reports/',
  filename: (req, file, cb) => {
    cb(null, 'stockreport-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage }).single('stockReport');

const createInventory = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    try {
      const product = await Product.findById(req.body.productId);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      
      const inventoryData = { ...req.body };
      if (req.file) inventoryData.stockReport = req.file.path;
      
      const inventory = await Inventory.create(inventoryData);
      res.status(201).json(inventory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find().populate('productId', 'name category barcode');
    const inventoryWithStatus = inventory.map(item => ({
      ...item.toObject(),
      stockStatus: item.stockStatus
    }));
    res.json(inventoryWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getInventoryById = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id).populate('productId');
    if (!inventory) return res.status(404).json({ message: 'Inventory not found' });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStock = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const { currentStock, reorderLevel, maxStock, warehouseLocation, expiryDate } = req.body;

      if (currentStock < 0) {
        return res.status(400).json({ message: 'Stock cannot be negative' });
      }

      const updateData = {
        currentStock,
        reorderLevel,
        maxStock,
        warehouseLocation,
        expiryDate: expiryDate || undefined,
        lastRestockedDate: Date.now()
      };

      if (req.file) updateData.stockReport = req.file.path;  // ← update report if new file uploaded

      const inventory = await Inventory.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!inventory) return res.status(404).json({ message: 'Inventory not found' });
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};
const deleteInventory = async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Inventory record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createInventory, getInventory, getInventoryById, updateStock, deleteInventory };