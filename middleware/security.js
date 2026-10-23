const rateLimit = require('express-rate-limit')
const { isProd } = require('../config/env')
const { HttpError } = require('../utils/helpers')

// sign in, sign up and password changes: slow down guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => next(new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.')),
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProd ? 300 : 3000,
  standardHeaders: true,
  legacyHeaders: false,
})

// Cookies are sent cross-site in production, so a changing request must carry a header that only our own frontend
// (an allowed CORS origin) can add. A forged form on another site can't, which closes CSRF.
const requireAjaxHeader = (req, res, next) => {
  if (!isProd || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('x-requested-with') === 'shop') return next()
  next(new HttpError(403, 'Blocked request'))
}

module.exports = { authLimiter, apiLimiter, requireAjaxHeader }
