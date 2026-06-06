const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  const { name, email, password, role, country, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, password, and role are required fields',
    });
  }

  // Validate email domain structure or role values
  const validRoles = ['admin', 'procurement_officer', 'manager', 'vendor'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role specified',
    });
  }

  try {
    // Check if user already exists
    const userExist = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save to users table
    const result = await db.query(
      `INSERT INTO users (name, email, password, role, country, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, country, phone, photo_url, is_active, created_at`,
      [name, email, hashedPassword, role, country || null, phone || null]
    );

    const user = result.rows[0];

    // If role is vendor, link to an existing vendor profile or create a new one
    if (role === 'vendor') {
      const vendorCheck = await db.query('SELECT id FROM vendors WHERE email = $1', [email]);
      if (vendorCheck.rows.length > 0) {
        // Associate existing vendor with this user
        await db.query('UPDATE vendors SET user_id = $1 WHERE email = $2', [user.id, email]);
      } else {
        // Create new vendor profile
        await db.query(
          `INSERT INTO vendors (user_id, company_name, category, email, phone, contact_person, status)
           VALUES ($1, $2, 'General', $3, $4, $2, 'active')`,
          [user.id, name, email, phone || null]
        );
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login a user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  try {
    // Find user
    const result = await db.query(
      `SELECT id, name, email, password, role, country, phone, photo_url, is_active, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated',
      });
    }

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Remove password hash from returned object
    delete user.password;

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Emit Socket.io event "user_logged_in"
    const io = req.app.get('io');
    if (io) {
      io.emit('user_logged_in', user.id);
    }

    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile details
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is populated by authenticateToken middleware
    const result = await db.query(
      `SELECT id, name, email, role, country, phone, photo_url, is_active, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all registered users
 * GET /api/auth/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users
       ORDER BY name ASC`
    );

    res.status(200).json({
      success: true,
      users: result.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
};
