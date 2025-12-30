/**
 * Database Configuration
 * 
 * This file handles the MongoDB database connection using Mongoose.
 * It establishes a connection to MongoDB, handles connection events,
 * and provides error handling for connection issues.
 */

import mongoose from 'mongoose';

/**
 * Connect to MongoDB Database
 * 
 * Establishes a connection to MongoDB using the connection string
 * from environment variables. Handles connection events and errors.
 * 
 * @returns {Promise<void>} Promise that resolves when connection is established
 */
export const connectDB = async () => {
  try {
    // Get MongoDB connection URI from environment variables
    const mongoURI = process.env.MONGO_URI;

    // Check if MONGO_URI is provided
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    // Set Mongoose options for better connection handling
    const options = {
      // Use new URL parser
      // Remove deprecated options that are now defaults in Mongoose 6+
    };

    // Attempt to connect to MongoDB
    const conn = await mongoose.connect(mongoURI, options);

    // Log successful connection
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    // Log connection error with details
    console.error('❌ MongoDB connection failed:');
    console.error(`   Error: ${error.message}`);
    
    // Provide specific guidance based on error type
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n   🔧 Connection Refused - MongoDB is not running or not accessible.');
      console.error('   Solutions:');
      console.error('   1. Start MongoDB locally:');
      console.error('      - Windows: net start MongoDB');
      console.error('      - macOS/Linux: sudo systemctl start mongod');
      console.error('   2. Or use MongoDB Atlas (cloud):');
      console.error('      - Create a free cluster at https://www.mongodb.com/cloud/atlas');
      console.error('      - Update MONGO_URI in .env file with your Atlas connection string');
      console.error('   3. Check your MONGO_URI in .env file:');
      console.error(`      Current: ${mongoURI ? 'Set (but connection failed)' : 'NOT SET'}`);
      if (!mongoURI) {
        console.error('      Example: mongodb://localhost:27017/pickleball-tournament');
      }
    } else if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      console.error('   Please check your MongoDB connection string and ensure MongoDB is running.');
    } else if (!mongoURI) {
      console.error('\n   🔧 MONGO_URI is not set in environment variables.');
      console.error('   Create a .env file in the backend directory with:');
      console.error('   MONGO_URI=mongodb://localhost:27017/pickleball-tournament');
    }
    
    // Exit process with failure code
    process.exit(1);
  }
};

// Export mongoose instance for use in models
export default mongoose;

