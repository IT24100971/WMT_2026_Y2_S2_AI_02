const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const Supplier = require('./models/Supplier');
const Inventory = require('./models/Inventory');
const Shift = require('./models/Shift');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFile = async (localPath, folderName) => {
  const fullPath = path.join(__dirname, localPath);
  if (fs.existsSync(fullPath)) {
    console.log(`Uploading ${fullPath} to Cloudinary...`);
    const result = await cloudinary.uploader.upload(fullPath, {
      folder: folderName,
      resource_type: 'auto'
    });
    console.log(`Uploaded! New URL: ${result.secure_url}`);
    return result.secure_url;
  } else {
    console.log(`File not found: ${fullPath}`);
    return null;
  }
};

const migrate = async () => {
  try {
    const directUri = 'mongodb://sunrise:Test123@ac-ovy8bs7-shard-00-00.3snbeux.mongodb.net:27017,ac-ovy8bs7-shard-00-01.3snbeux.mongodb.net:27017,ac-ovy8bs7-shard-00-02.3snbeux.mongodb.net:27017/sunriseDB?ssl=true&replicaSet=atlas-137tci-shard-0&authSource=admin&retryWrites=true&w=majority';
    await mongoose.connect(directUri);
    console.log('MongoDB Connected via direct seedlist.');

    // 1. Migrate Suppliers
    const suppliers = await Supplier.find();
    for (const supplier of suppliers) {
      if (supplier.contractDocument && !supplier.contractDocument.startsWith('http')) {
        console.log(`Migrating supplier ${supplier.supplierName}`);
        const newUrl = await uploadFile(supplier.contractDocument, 'wmt_contracts');
        if (newUrl) {
          supplier.contractDocument = newUrl;
          await supplier.save();
        }
      }
    }

    // 2. Migrate Inventory
    const inventories = await Inventory.find();
    for (const inv of inventories) {
      if (inv.stockReport && !inv.stockReport.startsWith('http')) {
        console.log(`Migrating inventory ${inv._id}`);
        const newUrl = await uploadFile(inv.stockReport, 'wmt_reports');
        if (newUrl) {
          inv.stockReport = newUrl;
          await inv.save();
        }
      }
    }

    // 3. Migrate Shifts
    const shifts = await Shift.find();
    for (const shift of shifts) {
      if (shift.attendanceReport && !shift.attendanceReport.startsWith('http')) {
        console.log(`Migrating shift ${shift._id}`);
        const newUrl = await uploadFile(shift.attendanceReport, 'wmt_shifts');
        if (newUrl) {
          shift.attendanceReport = newUrl;
          await shift.save();
        }
      }
    }
    
    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

migrate();
