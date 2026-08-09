const AdminAuditLog = require('../models/AdminAuditLog');

async function logAdminAction({
  adminId,
  action,
  userId,
  tournamentId,
  payoutId,
  refundId,
  amount,
  previousStatus,
  newStatus,
  reason,
  meta,
}) {
  try {
    await AdminAuditLog.create({
      adminId,
      action,
      userId,
      tournamentId,
      payoutId,
      refundId,
      amount,
      previousStatus,
      newStatus,
      reason,
      meta,
    });
  } catch (e) {
    console.error('audit log failed:', e.message);
  }
}

module.exports = { logAdminAction };
