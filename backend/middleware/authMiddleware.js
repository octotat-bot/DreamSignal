const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  // Prefer the Authorization header. Fall back to `?token=` query param so
  // EventSource clients (which can't set custom headers) can authenticate
  // the SSE stream. URLs may end up in proxy logs — acceptable for this
  // single-user app, but worth swapping to httpOnly cookies for prod.
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = String(req.query.token);
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_key_minimum_32_chars'
    );

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    return next();
  } catch (error) {
    console.error('Token validation failed:', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
