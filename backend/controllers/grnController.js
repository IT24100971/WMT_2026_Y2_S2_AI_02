const GRN = require('../models/GRN');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============ IMAGE UPLOAD CONFIGURATION ============
const grnUploadDir = path.join(__dirname, '..', 'uploads', 'grn');
if (!fs.existsSync(grnUploadDir)) {
  fs.mkdirSync(grnUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, grnUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'grn-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).array('grnImages', 4);

// ============ HELPERS ============
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

// Convert disk path to stored relative path used by frontend
const relativePath = (file) => path.join('uploads', 'grn', path.basename(file.filename)).replace(/\\/g, '/');

const parseExistingImages = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [value].filter(Boolean);
  }
};

const deleteImageFromDisk = (storedPath) => {
  if (!storedPath) return;

  const filePath = path.join(__dirname, '..', storedPath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// ============ CONTROLLERS ============
const createGRN = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const { supplierId, productId, invoicedQty, receivedQty, condition } = req.body;

      if (!supplierId || !productId || !invoicedQty || !receivedQty) {
        return res.status(400).json({ message: 'Please fill all required fields' });
      }

      const supplier = await Supplier.findById(supplierId);
      if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: 'Product not found' });

      const files = req.files || [];
      const images = files.map(f => relativePath(f));

      const grn = new GRN({
        grnNumber: generateGRNNumber(),
        supplierId,
        productId,
        invoicedQty: Number(invoicedQty),
        receivedQty: Number(receivedQty),
        condition: condition || 'Good',
        receivedBy: req.user ? req.user.id : null,
        receivedDate: new Date(),
        image: images.length > 0 ? images[0] : null,
        images
      });

      await grn.save();

      const populatedGRN = await GRN.findById(grn._id)
        .populate('supplierId', 'supplierName contactNumber email')
        .populate('productId', 'name category barcode sellingPrice')
        .populate('receivedBy', 'fullName email role')
        .populate('readBy', 'fullName email role');

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
    const grns = await GRN.find(filter)
      .populate('supplierId', 'supplierName contactNumber email address')
      .populate('productId', 'name category barcode unit sellingPrice')
      .populate('receivedBy', 'fullName email')
      .populate('readBy', 'fullName email role')
      .sort({ receivedDate: -1 });

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
    const grn = await GRN.findById(req.params.id)
      .populate('supplierId', 'supplierName contactNumber email address')
      .populate('productId', 'name category barcode unit sellingPrice')
      .populate('receivedBy', 'fullName email')
      .populate('readBy', 'fullName email role');

    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    res.json({ success: true, data: grn });
  } catch (error) {
    console.error('Get GRN by id error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateGRN = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    try {
      const grn = await GRN.findById(req.params.id);
      if (!grn) return res.status(404).json({ message: 'GRN not found' });

      const { supplierId, productId, invoicedQty, receivedQty, condition } = req.body;
      if (supplierId) grn.supplierId = supplierId;
      if (productId) grn.productId = productId;
      if (invoicedQty !== undefined) grn.invoicedQty = Number(invoicedQty);
      if (receivedQty !== undefined) grn.receivedQty = Number(receivedQty);
      if (condition) grn.condition = condition;

      const files = req.files || [];
      const uploadedImages = files.map(f => relativePath(f));
      const existingImages = parseExistingImages(req.body.existingImages);
      const previousImages = Array.isArray(grn.images) ? grn.images : (grn.image ? [grn.image] : []);
      const hasExistingImagesPayload = req.body.existingImages !== undefined;

      const finalImages = Array.from(new Set([
        ...existingImages,
        ...uploadedImages,
        ...(!hasExistingImagesPayload ? previousImages : [])
      ]));

      const removedImages = previousImages.filter(img => !finalImages.includes(img));
      removedImages.forEach(deleteImageFromDisk);

      grn.images = finalImages;
      grn.image = finalImages[0] || null;

      await grn.save();
      const populated = await GRN.findById(grn._id)
        .populate('supplierId', 'supplierName contactNumber email')
        .populate('productId', 'name')
        .populate('receivedBy', 'fullName email role')
        .populate('readBy', 'fullName email role');
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

    // Remove images from disk
    if (Array.isArray(grn.images)) {
      grn.images.forEach(img => {
        const imgPath = path.join(__dirname, '..', img);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      });
    }

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

    const populated = await GRN.findById(grn._id)
      .populate('supplierId', 'supplierName contactNumber email address')
      .populate('productId', 'name category barcode unit sellingPrice')
      .populate('receivedBy', 'fullName email role')
      .populate('readBy', 'fullName email role');

    res.json({ success: true, message: 'GRN marked as read', data: populated });
  } catch (error) {
    console.error('Mark GRN as read error:', error);
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
  markGRNAsRead
};