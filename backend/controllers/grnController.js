const GRN = require('../models/GRN');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');

// ============ IMAGE UPLOAD CONFIGURATION ============
const storage = multer.diskStorage({
  destination: './uploads/grn/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'delivery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('deliveryImage');

// ============ HELPER FUNCTION ============
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

// ============ CREATE GRN (with image upload) ============
const createGRN = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    try {
      const { supplierId, productId, invoicedQty, receivedQty, condition } = req.body;
      
      // Validate required fields
      if (!supplierId || !productId || !invoicedQty || !receivedQty) {
        return res.status(400).json({ message: 'Please fill all required fields' });
      }
      
      // Check if supplier exists
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      
      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Validate quantities
      if (Number(receivedQty) < 0) {
        return res.status(400).json({ message: 'Received quantity cannot be negative' });
      }
      
      // Create GRN
      const grn = await GRN.create({
        grnNumber: generateGRNNumber(),
        supplierId,
        productId,
        invoicedQty: Number(invoicedQty),
        receivedQty: Number(receivedQty),
        condition: condition || 'Good',
        receivedBy: req.user.id,
        receivedDate: new Date(),
        image: req.file ? req.file.path : null
      });
      
      // Populate the response
      const populatedGRN = await GRN.findById(grn._id)
        .populate('supplierId', 'supplierName contactNumber email')
        .populate('productId', 'name category barcode sellingPrice')
        .populate('receivedBy', 'fullName email role');
      
      res.status(201).json({
        success: true,
        message: 'GRN created successfully',
        data: {
          ...populatedGRN.toObject(),
          shipmentStatus: populatedGRN.shipmentStatus
        }
      });
      
    } catch (error) {
      console.error('Create GRN error:', error);
      res.status(500).json({ message: error.message });
    }
  });
};

// ============ GET ALL GRNS ============
const getGRNs = async (req, res) => {
  try {
    const { startDate, endDate, supplierId } = req.query;
    
    // Build filter
    let filter = {};
    if (supplierId) filter.supplierId = supplierId;
    if (startDate && endDate) {
      filter.receivedDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const grns = await GRN.find(filter)
      .populate('supplierId', 'supplierName contactNumber email address')
      .populate('productId', 'name category barcode unit sellingPrice')
      .populate('receivedBy', 'fullName email')
      .sort({ receivedDate: -1 });
    
    const grnsWithStatus = grns.map(grn => ({
      ...grn.toObject(),
      shipmentStatus: grn.shipmentStatus,
      shortShipmentAmount: grn.invoicedQty - grn.receivedQty
    }));
    
    res.json({
      success: true,
      count: grns.length,
      data: grnsWithStatus
    });
    
  } catch (error) {
    console.error('Get GRNs error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============ GET SINGLE GRN BY ID ============
const getGRNById = async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id)
      .populate('supplierId', 'supplierName contactNumber email address status')
      .populate('productId', 'name category barcode unit sellingPrice costPrice')
      .populate('receivedBy', 'fullName email role');
    
    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }
    
    res.json({
      success: true,
      data: {
        ...grn.toObject(),
        shipmentStatus: grn.shipmentStatus,
        shortShipmentAmount: grn.invoicedQty - grn.receivedQty
      }
    });
    
  } catch (error) {
    console.error('Get GRN by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============ UPDATE GRN ============
const updateGRN = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    try {
      const { invoicedQty, receivedQty, condition } = req.body;
      
      const updateData = {};
      if (invoicedQty) updateData.invoicedQty = Number(invoicedQty);
      if (receivedQty) updateData.receivedQty = Number(receivedQty);
      if (condition) updateData.condition = condition;
      if (req.file) updateData.image = req.file.path;
      
      const grn = await GRN.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('supplierId', 'supplierName contactNumber')
        .populate('productId', 'name category')
        .populate('receivedBy', 'fullName email');
      
      if (!grn) {
        return res.status(404).json({ message: 'GRN not found' });
      }
      
      res.json({
        success: true,
        message: 'GRN updated successfully',
        data: {
          ...grn.toObject(),
          shipmentStatus: grn.shipmentStatus
        }
      });
      
    } catch (error) {
      console.error('Update GRN error:', error);
      res.status(500).json({ message: error.message });
    }
  });
};

// ============ DELETE GRN ============
const deleteGRN = async (req, res) => {
  try {
    const grn = await GRN.findByIdAndDelete(req.params.id);
    
    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }
    
    res.json({
      success: true,
      message: 'GRN deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete GRN error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============ GET GRN BY SUPPLIER ============
const getGRNsBySupplier = async (req, res) => {
  try {
    const grns = await GRN.find({ supplierId: req.params.supplierId })
      .populate('productId', 'name category barcode')
      .populate('receivedBy', 'fullName')
      .sort({ receivedDate: -1 });
    
    res.json({
      success: true,
      count: grns.length,
      data: grns
    });
    
  } catch (error) {
    console.error('Get GRNs by supplier error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============ GET GRN STATISTICS ============
const getGRNStatistics = async (req, res) => {
  try {
    const totalGRNs = await GRN.countDocuments();
    const shortShipments = await GRN.countDocuments({
      $expr: { $lt: ["$receivedQty", "$invoicedQty"] }
    });
    const damagedShipments = await GRN.countDocuments({ condition: 'Damaged' });
    
    const totalInvoiced = await GRN.aggregate([
      { $group: { _id: null, total: { $sum: "$invoicedQty" } } }
    ]);
    
    const totalReceived = await GRN.aggregate([
      { $group: { _id: null, total: { $sum: "$receivedQty" } } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalGRNs,
        shortShipments,
        damagedShipments,
        totalInvoicedQty: totalInvoiced[0]?.total || 0,
        totalReceivedQty: totalReceived[0]?.total || 0
      }
    });
    
  } catch (error) {
    console.error('Get GRN statistics error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createGRN,
  getGRNs,
  getGRNById,
  updateGRN,
  deleteGRN,
  getGRNsBySupplier,
  getGRNStatistics
};