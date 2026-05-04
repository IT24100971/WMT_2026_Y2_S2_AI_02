const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wmt_reports',
    resource_type: 'auto'
  }
});
const upload = multer({ storage }).single('stockReport');

const createInventory = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    try {
      const product = await Product.findById(req.body.productId);
      if (!product) return res.status(404).json({ message: 'Product not found' });
        const warehouseLocation = (req.body.warehouseLocation || '').toString().trim();
        if (!warehouseLocation) return res.status(400).json({ message: 'Warehouse location is required' });

        const inventoryData = { ...req.body };
        inventoryData.warehouseLocation = warehouseLocation;
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

const getWarehousesByProduct = async (req, res) => {
  try {
    const inventory = await Inventory.find({
      productId: req.params.productId,
      warehouseLocation: { $nin: [null, ''] }
    }).select('warehouseLocation currentStock');

    const warehouses = Array.from(
      new Map(
        inventory
          .map(item => [item.warehouseLocation, {
            warehouseLocation: item.warehouseLocation,
            currentStock: item.currentStock
          }])
      ).values()
    );

    res.json({ success: true, data: warehouses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStock = async (req, res) => {
  try {
    const { currentStock } = req.body;
    if (currentStock < 0) {
      return res.status(400).json({ message: 'Stock cannot be negative' });
    }
    
    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { currentStock, lastRestockedDate: Date.now() },
      { new: true }
    );
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateInventory = async (req, res) => {
  // Check if this is multipart/form-data
  const contentType = req.headers['content-type'] || '';
  const isMultipart = contentType.includes('multipart/form-data');

  if (isMultipart) {
    // Use multer to parse multipart
    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message });

      try {
        const inventory = await Inventory.findById(req.params.id);
        if (!inventory) return res.status(404).json({ message: 'Inventory not found' });

        if (req.body.productId) {
          const product = await Product.findById(req.body.productId);
          if (!product) return res.status(404).json({ message: 'Product not found' });
          inventory.productId = req.body.productId;
        }
        if (req.body.currentStock !== undefined) inventory.currentStock = req.body.currentStock;
        if (req.body.reorderLevel !== undefined) inventory.reorderLevel = req.body.reorderLevel;
        if (req.body.maxStock !== undefined) inventory.maxStock = req.body.maxStock;
        const warehouseLocation = (req.body.warehouseLocation || '').toString().trim();
        if (!warehouseLocation) return res.status(400).json({ message: 'Warehouse location is required' });
        inventory.warehouseLocation = warehouseLocation;
        if (req.body.expiryDate !== undefined) inventory.expiryDate = req.body.expiryDate;

        if (req.file) inventory.stockReport = req.file.path;

        await inventory.save();
        res.json(inventory);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });
  } else {
    // Handle JSON
    try {
      const inventory = await Inventory.findById(req.params.id);
      if (!inventory) return res.status(404).json({ message: 'Inventory not found' });

      if (req.body.productId) {
        const product = await Product.findById(req.body.productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        inventory.productId = req.body.productId;
      }
      if (req.body.currentStock !== undefined) inventory.currentStock = req.body.currentStock;
      if (req.body.reorderLevel !== undefined) inventory.reorderLevel = req.body.reorderLevel;
      if (req.body.maxStock !== undefined) inventory.maxStock = req.body.maxStock;
      const warehouseLocation = (req.body.warehouseLocation || '').toString().trim();
      if (!warehouseLocation) return res.status(400).json({ message: 'Warehouse location is required' });
      inventory.warehouseLocation = warehouseLocation;
      if (req.body.expiryDate !== undefined) inventory.expiryDate = req.body.expiryDate;

      await inventory.save();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

const deleteInventory = async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Inventory record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createInventory, getInventory, getInventoryById, getWarehousesByProduct, updateStock, updateInventory, deleteInventory };