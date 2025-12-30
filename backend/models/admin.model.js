/**
 * Admin Model
 * 
 * This model defines the schema for admin users in the system.
 * Admins are the only authenticated users and have full access to
 * tournament management features.
 * 
 * Security considerations:
 * - Passwords are hashed using bcrypt before saving (see pre-save hook)
 * - Email is unique and required for login
 * - Role is fixed to "admin" to prevent privilege escalation
 * - No registration endpoint exists - admins must be created manually
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      // Don't return password in queries by default
      select: false
    },
    role: {
      type: String,
      enum: ['admin'],
      default: 'admin',
      // Prevent role modification after creation
      immutable: true
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    // Remove __v field from JSON output
    versionKey: false
  }
);

/**
 * Pre-save Hook: Hash Password
 * 
 * This hook automatically hashes the password before saving to the database.
 * This ensures passwords are never stored in plain text, which is a critical
 * security requirement.
 * 
 * Security decision: We hash on every save, even if password hasn't changed.
 * This is slightly less efficient but ensures consistency and prevents
 * edge cases where password might be modified outside the model.
 */
adminSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt with 10 rounds (balance between security and performance)
    // Higher rounds = more secure but slower
    const salt = await bcrypt.genSalt(10);
    
    // Hash password with salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance Method: Compare Password
 * 
 * This method allows comparing a plain text password with the hashed
 * password stored in the database. Used during login authentication.
 * 
 * Security decision: We use bcrypt.compare which handles timing attacks
 * by using constant-time comparison internally.
 * 
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create and export Admin model
const Admin = mongoose.model('Admin', adminSchema);

export default Admin;

