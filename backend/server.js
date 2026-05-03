const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Increase payload limit for Base64 images
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.log('MongoDB Connection Failed:', err.message));

// Import routes
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const grnRoutes = require('./routes/grnRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const supplierRoutes = require('./routes/supplierRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/grns', grnRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/suppliers', supplierRoutes);

// Health check — root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SunriseSuper API is running 🚀',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/products',
      '/api/inventory',
      '/api/grns',
      '/api/shifts',
      '/api/suppliers',
      '/api/complaints',
    ]
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));