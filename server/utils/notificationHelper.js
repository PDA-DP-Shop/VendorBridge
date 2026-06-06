const db = require('../config/db');

/**
 * Reusable helper to insert a notification and emit a real-time socket event
 * @param {object} clientOrDb - pg client or db pool to run query
 * @param {number} userId - ID of user receiving notification
 * @param {string} title - notification title
 * @param {string} message - notification message content
 * @param {string} entityType - associated entity ('rfq', 'quotation', 'approval', 'purchase_order', 'invoice')
 * @param {number} entityId - primary key of associated entity
 * @param {object} io - socket.io instance
 */
const sendNotification = async (clientOrDb, userId, title, message, entityType, entityId, io) => {
  try {
    const res = await clientOrDb.query(
      `INSERT INTO notifications (user_id, title, message, entity_type, entity_id, is_read)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING id, user_id, title, message, entity_type, entity_id, is_read, created_at`,
      [userId, title, message, entityType, entityId]
    );

    const notification = res.rows[0];

    if (io) {
      console.log(`Emitting 'new_notification' to user_${userId}:`, notification.invoice_number || notification.title);
      io.to(`user_${userId}`).emit('new_notification', notification);
    }
    return notification;
  } catch (err) {
    console.error('Failed to create/send notification:', err.message);
  }
};

module.exports = {
  sendNotification,
};
