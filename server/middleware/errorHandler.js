/**
 * Global Express error handling middleware.
 * Formats errors and returns standard JSON responses.
 */
const errorHandler = (err, req, res, next) => {
  // Log the error to console (and error tracker if setup)
  console.error('API Error:', err);

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Construct standardized error response
  const errorResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  // Include stack trace only in non-production environments
  if (!isProd) {
    errorResponse.stack = err.stack;
  }

  // Handle specific database/validation errors if needed
  if (err.code === '23505') {
    // Unique key violation in PostgreSQL
    errorResponse.message = 'Duplicate key error: A record with this unique constraint already exists.';
    return res.status(400).json(errorResponse);
  }

  if (err.code === '23503') {
    // Foreign key violation in PostgreSQL
    errorResponse.message = 'Foreign key violation: Referenced record does not exist or is still referenced by other items.';
    return res.status(400).json(errorResponse);
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
