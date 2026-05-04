# WMT_2026_Y2_S2_AI_02

Warehouse Management & Inventory Tracking System

## Installation & Setup

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Create Environment File**
   - Copy `.env.example` to `.env`
   - Fill in your configuration values:
     - MongoDB URI for database connection
     - JWT secret for authentication
     - **Cloudinary credentials for image uploads** (required for product images, GRN documents, and complaint evidence)

3. **Get Cloudinary Credentials**
   - Go to [Cloudinary.com](https://cloudinary.com)
   - Sign up for a free account
   - Navigate to Dashboard → Settings → API Keys
   - Copy your Cloud Name, API Key, and API Secret
   - Add these to your `.env` file

4. **Start Backend Server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend/SunriseSuper
   npm install
   ```

2. **Start Expo Development Server**
   ```bash
   npm start
   # or
   expo start
   ```

## Image Upload Configuration

The app uses **Cloudinary** for storing images:
- Product images
- GRN supporting documents
- Complaint evidence photos

**Troubleshooting Image Upload Issues:**
- If you see "Image upload failed" errors, verify your Cloudinary credentials in `.env`
- Check that your `.env` file exists in the `backend/` directory
- Ensure all required environment variables are set
- Test your Cloudinary credentials by logging into your Cloudinary dashboard

## Features

- Inventory management with warehouse tracking
- GRN (Goods Received Notes) processing
- Complaint management system
- Real-time stock updates
- Role-based access control (Admin, Supervisor, Worker)
