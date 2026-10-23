const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { isProd, jwtSecret } = require('../config/env')

// lets controllers be async without try/catch: a thrown error reaches the error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const isId = (value) => mongoose.isValidObjectId(value) && String(new mongoose.Types.ObjectId(value)) === String(value)
const requireId = (value, label = 'id') => {
  if (!isId(value)) throw new HttpError(400, `Invalid ${label}`)
  return String(value)
}

// anything a client sends is forced to a plain trimmed string, so {"$ne": ""} can't reach a query
const text = (value, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

const COOKIE = 'jwt'
const cookieOptions = {
  httpOnly: true,
  // the shop and the API usually live on different sites in production, so the cookie must be allowed cross-site (and then must be Secure)
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  maxAge: 30 * 24 * 60 * 60 * 1000,
}
const issueSession = (res, userId) => {
  const token = jwt.sign({ userId }, jwtSecret, { expiresIn: '30d' })
  res.cookie(COOKIE, token, cookieOptions)
}
const clearSession = (res) => res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined })

const publicUser = (user) => ({ _id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin, createdAt: user.createdAt })

const pageParams = (query, defaultLimit = 12, maxLimit = 48) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit))
  return { page, limit, skip: (page - 1) * limit }
}

module.exports = { asyncHandler, HttpError, isId, requireId, text, escapeRegex, round2, COOKIE, issueSession, clearSession, publicUser, pageParams }
