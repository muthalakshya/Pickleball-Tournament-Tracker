/**
 * Create Admin User Script
 * 
 * This script creates an admin user in the database.
 * Run this script to set up your first admin account.
 * 
 * Usage:
 * node scripts/createAdmin.js
 * 
 * Or with custom credentials:
 * node scripts/createAdmin.js admin@example.com password123
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/admin.model.js';
import { connectDB } from '../config/db.js';

// Load environment variables
dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    // Get email and password from command line arguments or use defaults
    const email = process.argv[2] || 'admin@gmail.com';
    const password = process.argv[3] || '123456';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });

    if (existingAdmin) {
      console.log(`❌ Admin with email ${email} already exists.`);
      console.log('   If you want to reset the password, delete the existing admin first.');
      process.exit(1);
    }

    // Create new admin
    const admin = new Admin({
      email: email.toLowerCase(),
      password: password,
      role: 'admin'
    });

    await admin.save();

    console.log('✅ Admin created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    console.log('\n⚠️  Please change the password after first login for security.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

// Run the script
createAdmin();

