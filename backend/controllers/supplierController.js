const Supplier = require('../models/Supplier');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wmt_contracts',
    resource_type: 'auto'
  }
});

const upload = multer({ storage }).single('contractDocument');

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const createSupplier = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    try {
      const { email, contactNumber } = req.body;
      
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      const existing = await Supplier.findOne({ $or: [{ email }, { contactNumber }] });
      if (existing) {
        return res.status(400).json({ message: 'Supplier with this email or phone already exists' });
      }
      
      const supplierData = { ...req.body };
      if (req.file) supplierData.contractDocument = req.file.path;
      
      const supplier = await Supplier.create(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSupplier = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    
    try {
      const updateData = { ...req.body };
      if (req.file) updateData.contractDocument = req.file.path;
      
      const supplier = await Supplier.findByIdAndUpdate(req.params.id, updateData, { new: true });
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

const deleteSupplier = async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSupplier, getSuppliers, getSupplierById, updateSupplier, deleteSupplier };