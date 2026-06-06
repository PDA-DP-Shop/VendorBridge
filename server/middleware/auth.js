const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests using a JWT token.
 * Looks for token in the Authorization header (Bearer <token>).
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Attach decoded user info to the request object
    // Decoded payload typically contains { id, email, role }
    req.user = decoded;
    next();
  });
};

/**
 * Middleware to restrict access based on user roles.
 * Must be placed after authenticateToken.
 * @param {...string} allowedRoles - Roles that are authorized to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to perform this action',
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorize,
};
