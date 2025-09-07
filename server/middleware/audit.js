const { query } = require('../config/database');

const createAuditLog = async (req, tableName, recordId, action, oldValues = null, newValues = null, reason = null) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    await query(`
      INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, user_id, reason, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      tableName,
      recordId,
      action,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      req.user?.id,
      reason,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

const auditMiddleware = (tableName, getRecordId = (req) => req.params.id) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    let responseData = null;

    // Capture response data
    res.send = function(data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const recordId = getRecordId(req);
        let action = 'UNKNOWN';
        let oldValues = null;
        let newValues = null;

        // Determine action based on HTTP method
        switch (req.method) {
          case 'POST':
            action = 'INSERT';
            if (responseData) {
              try {
                const parsed = JSON.parse(responseData);
                newValues = parsed;
              } catch (e) {
                newValues = { created: true };
              }
            }
            break;
          case 'PUT':
          case 'PATCH':
            action = 'UPDATE';
            if (responseData) {
              try {
                const parsed = JSON.parse(responseData);
                newValues = parsed;
              } catch (e) {
                newValues = { updated: true };
              }
            }
            break;
          case 'DELETE':
            action = 'DELETE';
            break;
        }

        // Get reason from request body if available
        const reason = req.body?.reason || req.body?.correction_reason || null;

        await createAuditLog(req, tableName, recordId, action, oldValues, newValues, reason);
      }
    });

    next();
  };
};

module.exports = {
  createAuditLog,
  auditMiddleware
};