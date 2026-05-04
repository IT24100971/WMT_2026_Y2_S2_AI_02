const GRN = require('../models/GRN');
const Inventory = require('../models/Inventory');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Try to configure Cloudinary if credentials exist
let storage;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'sunrise-supermarket/grn',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    },
  });
} else {
  // Fallback to local storage if Cloudinary credentials are not available
  console.warn('⚠️  Cloudinary credentials not configured in GRN controller. Using local storage.');
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueName + path.extname(file.originalname));
    },
  });
}

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    } else {
      cb(null, true);
    }
  }
}).array('grnImages', 4);

const generateGRNNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `GRN-${year}${month}${day}-${hours}${minutes}${seconds}`;
};

const parseExistingImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [value].filter(Boolean);
  }
};

const populateGRNDetails = (query) => query
  .populate('supplierId', 'supplierName contactNumber email address')
  .populate('productId', 'name category barcode unit sellingPrice')
  .populate('receivedBy', 'fullName email role')
  .populate('readBy', 'fullName email role')
  .populate('inventoryAppliedBy', 'fullName email role');

const validateWarehouseForProduct = async (productId, warehouseLocation) => {
  const availableWarehouses = await Inventory.distinct('warehouseLocation', {
    productId,
    warehouseLocation: { $nin: [null, ''] }
  });

  return availableWarehouses.includes(warehouseLocation);
};

const createGRN = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer/Cloudinary Upload Error:', err);
      return res.status(400).json({ 
        message: `Image upload failed: ${err.message}. Please ensure the images are valid and try again.` 
      });
    }

    try {
      const { supplierId, productId, invoicedQty, receivedQty, condition, notes } = req.body;
      const warehouseLocation = String(req.body.warehouseLocation || '').trim();

      if (!supplierId || !productId || !invoicedQty || !receivedQty || !warehouseLocation) {
        return res.status(400).json({ message: 'Please fill all required fields' });
      }

      const supplier = await Supplier.findById(supplierId);
      if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: 'Product not found' });

      const warehouseIsValid = await validateWarehouseForProduct(product._id, warehouseLocation);
      if (!warehouseIsValid) {
        return res.status(400).json({ message: 'Selected warehouse is not available for this product' });
      }

      const files = req.files || [];
      const images = files.map(f => f.path);

      const grn = new GRN({
        grnNumber: generateGRNNumber(),
        supplierId,
        productId,
        invoicedQty: Number(invoicedQty),
        receivedQty: Number(receivedQty),
        unit: product.unit,
        warehouseLocation,
        condition: condition || 'Good',
        notes: notes || '',
        receivedBy: req.user ? req.user.id : null,
        receivedDate: new Date(),
        image: images.length > 0 ? images[0] : null,
        images
      });

      await grn.save();

      const populatedGRN = await populateGRNDetails(GRN.findById(grn._id));

      res.status(201).json({ success: true, message: 'GRN created successfully', data: populatedGRN });
    } catch (error) {
      console.error('Create GRN error:', error);
      res.status(500).json({ message: error.message });
    }
  });
};

const getGRNs = async (req, res) => {
  try {
    const { supplierId, startDate, endDate } = req.query;
    let filter = {};
    if (supplierId) filter.supplierId = supplierId;
    if (startDate && endDate) {
      filter.receivedDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const grns = await populateGRNDetails(
      GRN.find(filter).sort({ receivedDate: -1 })
    );

    const grnsWithStatus = grns.map(grn => ({
      ...grn.toObject(),
      shipmentStatus: grn.shipmentStatus,
      shortShipmentAmount: grn.invoicedQty - grn.receivedQty
    }));

    res.json({ success: true, count: grns.length, data: grnsWithStatus });
  } catch (error) {
    console.error('Get GRNs error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getGRNById = async (req, res) => {
  try {
    const grn = await populateGRNDetails(GRN.findById(req.params.id));

    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    res.json({ success: true, data: grn });
  } catch (error) {
    console.error('Get GRN by id error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateGRN = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer/Cloudinary Upload Error:', err);
      return res.status(400).json({ 
        message: `Image upload failed: ${err.message}. Please ensure the images are valid and try again.` 
      });
    }
    try {
      const grn = await GRN.findById(req.params.id);
      if (!grn) return res.status(404).json({ message: 'GRN not found' });

      const { supplierId, productId, invoicedQty, receivedQty, condition, notes } = req.body;
      const warehouseLocation = req.body.warehouseLocation !== undefined ? String(req.body.warehouseLocation || '').trim() : grn.warehouseLocation;
      if (supplierId) grn.supplierId = supplierId;
      if (productId) {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        grn.productId = productId;
        grn.unit = product.unit;
      }
      if (invoicedQty !== undefined) grn.invoicedQty = Number(invoicedQty);
      if (receivedQty !== undefined) grn.receivedQty = Number(receivedQty);
      if (condition) grn.condition = condition;
      if (req.body.warehouseLocation !== undefined) grn.warehouseLocation = warehouseLocation;
      if (notes !== undefined) grn.notes = notes;

      const finalProductId = grn.productId;
      const finalWarehouseLocation = grn.warehouseLocation;
      if (!finalWarehouseLocation) {
        return res.status(400).json({ message: 'Warehouse is required' });
      }
      const warehouseIsValid = await validateWarehouseForProduct(finalProductId, finalWarehouseLocation);
      if (!warehouseIsValid) {
        return res.status(400).json({ message: 'Selected warehouse is not available for this product' });
      }

      const files = req.files || [];
      const uploadedImages = files.map(f => f.path);
      const existingImages = parseExistingImages(req.body.existingImages);
      const previousImages = Array.isArray(grn.images) ? grn.images : (grn.image ? [grn.image] : []);
      const hasExistingImagesPayload = req.body.existingImages !== undefined;

      const finalImages = Array.from(new Set([
        ...existingImages,
        ...uploadedImages,
        ...(!hasExistingImagesPayload ? previousImages : [])
      ]));

      grn.images = finalImages;
      grn.image = finalImages[0] || null;

      await grn.save();
      const populated = await populateGRNDetails(GRN.findById(grn._id));
      res.json({ success: true, data: populated });
    } catch (error) {
      console.error('Update GRN error:', error);
      res.status(500).json({ message: error.message });
    }
  });
};

const deleteGRN = async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id);
    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    await GRN.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'GRN deleted' });
  } catch (error) {
    console.error('Delete GRN error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getGRNsBySupplier = async (req, res) => {
  try {
    const grns = await GRN.find({ supplierId: req.params.supplierId })
      .populate('supplierId', 'supplierName')
      .populate('productId', 'name')
      .sort({ receivedDate: -1 });
    res.json({ success: true, count: grns.length, data: grns });
  } catch (error) {
    console.error('Get GRNs by supplier error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getGRNStatistics = async (req, res) => {
  try {
    const total = await GRN.countDocuments();
    const unread = await GRN.countDocuments({ isRead: false });
    res.json({ success: true, data: { total, unread } });
  } catch (error) {
    console.error('Get GRN statistics error:', error);
    res.status(500).json({ message: error.message });
  }
};

const markGRNAsRead = async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id);
    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    grn.isRead = true;
    grn.readBy = req.user ? req.user.id : null;
    grn.readAt = new Date();
    await grn.save();

    const populated = await populateGRNDetails(GRN.findById(grn._id));

    res.json({ success: true, message: 'GRN marked as read', data: populated });
  } catch (error) {
    console.error('Mark GRN as read error:', error);
    res.status(500).json({ message: error.message });
  }
};

const applyGRNToInventory = async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id);
    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    if (!grn.isRead) {
      return res.status(400).json({ message: 'Mark the GRN as read before adding it to inventory' });
    }
    if (grn.inventoryApplied) {
      return res.status(400).json({ message: 'GRN has already been added to inventory' });
    }

    const receivedQty = Number(grn.receivedQty);
    const warehouseLocation = String(grn.warehouseLocation || '').trim();
    if (!warehouseLocation) {
      return res.status(400).json({ message: 'Warehouse is required' });
    }

    const inventory = await Inventory.findOneAndUpdate(
      { productId: grn.productId, warehouseLocation },
      {
        $inc: { currentStock: receivedQty },
        $set: { lastRestockedDate: new Date() },
        $setOnInsert: {
          productId: grn.productId,
          warehouseLocation,
          reorderLevel: 0,
          maxStock: receivedQty
        }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    grn.inventoryApplied = true;
    grn.inventoryAppliedBy = req.user ? req.user.id : null;
    grn.inventoryAppliedAt = new Date();
    await grn.save();

    const populated = await populateGRNDetails(GRN.findById(grn._id));

    res.json({ success: true, message: 'Inventory updated successfully', data: populated, inventory });
  } catch (error) {
    console.error('Apply GRN to inventory error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  upload,
  createGRN,
  getGRNs,
  getGRNById,
  updateGRN,
  deleteGRN,
  getGRNsBySupplier,
  getGRNStatistics,
  markGRNAsRead,
  applyGRNToInventory
};