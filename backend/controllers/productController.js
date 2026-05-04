const Product = require('../models/Product');
const upload = require('../middleware/upload');

const createProduct = (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Multer/Upload Error:', err);
      return res.status(400).json({ 
        message: `Image upload failed: ${err.message}. Please ensure the image is valid and try again.` 
      });
    }

    try {
      const { name, category, barcode, unit, sellingPrice, costPrice, description } = req.body;

      if (!name || !category || !barcode || !unit || !sellingPrice || !costPrice) {
        return res.status(400).json({ message: 'Please fill all required fields' });
      }

      if (isNaN(Number(sellingPrice)) || isNaN(Number(costPrice))) {
        return res.status(400).json({ message: 'Prices must be valid numbers' });
      }

      const existingProduct = await Product.findOne({ barcode });
      if (existingProduct) {
        return res.status(400).json({ message: 'A product with this barcode already exists' });
      }

      const product = await Product.create({
        name,
        category,
        barcode,
        unit,
        sellingPrice: Number(sellingPrice),
        costPrice: Number(costPrice),
        description,
        image: req.file ? req.file.path : null,
      });

      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
};

const getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProduct = (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Multer/Upload Error:', err);
      return res.status(400).json({ 
        message: `Image upload failed: ${err.message}. Please ensure the image is valid and try again.` 
      });
    }

    try {
      const updateData = { ...req.body };

      if (req.body.sellingPrice) updateData.sellingPrice = Number(req.body.sellingPrice);
      if (req.body.costPrice) updateData.costPrice = Number(req.body.costPrice);

      if (req.file) updateData.image = req.file.path;

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.status(200).json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProduct, getAllProducts, getSingleProduct, updateProduct, deleteProduct };