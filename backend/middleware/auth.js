/**
 * JWT authentication. Voter tokens are only issued after OTP verification;
 * admin tokens carry `role: 'admin'`.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

function signVoterToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: 'voter', voterIdHash: user.voterIdHash, state: user.state },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function signAdminToken(admin) {
  return jwt.sign({ sub: String(admin._id), role: 'admin' }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function readToken(req, { allowQuery = false } = {}) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  // EventSource cannot send headers, so the live stream accepts ?token=
  if (allowQuery && typeof req.query.token === 'string') return req.query.token;
  return null;
}

function authenticate(role, options) {
  return (req, res, next) => {
    const token = readToken(req, options);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
    }
    if (payload.role !== role) {
      return res.status(403).json({
        success: false,
        message: role === 'admin' ? 'Admin access required.' : 'Voter access required.',
      });
    }
    req.auth = payload;
    req.userId = payload.sub;
    return next();
  };
}

const requireVoter = authenticate('voter');
const requireAdmin = authenticate('admin');
const requireAdminStream = authenticate('admin', { allowQuery: true });

module.exports = { signVoterToken, signAdminToken, requireVoter, requireAdmin, requireAdminStream };
