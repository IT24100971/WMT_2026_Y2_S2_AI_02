const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

console.log('📝 Checking environment variables...');
console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET is not defined in .env file');
  process.exit(1);
}
console.log('✅ JWT_SECRET loaded successfully (length:', process.env.JWT_SECRET.length, ')');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.log('MongoDB Connection Failed:', err.message));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Sunrise Super API is running' });
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const grnRoutes = require('./routes/grnRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/grn', grnRoutes);

// Log all routes
console.log('\n📋 Registered routes:');
app._router.stack.forEach(middleware => {
  if (middleware.route) {
    console.log(`  ${Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(',')} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach(handler => {
      if (handler.route) {
        const method = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(',');
        console.log(`  ${method} ${handler.route.path}`);
      }
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}`);
});
