/**
 * Result of a database ↔ blockchain audit, kept so the admin dashboard can
 * show the latest findings and their history.
 */

const mongoose = require('mongoose');

const auditRunSchema = new mongoose.Schema(
  {
    summary: { type: Object, required: true },
    issues: { type: Array, default: [] },
    tallies: { type: Array, default: [] },
    durationMs: { type: Number, default: 0 },
  },
  { collection: 'auditRuns', timestamps: true }
);

module.exports = mongoose.model('AuditRun', auditRunSchema);
