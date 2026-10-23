const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { jwtSecret } = require('../config/env')
const { asyncHandler, HttpError, COOKIE } = require('../utils/helpers')

// the user is re-read from the database on every request, so a deleted account or a removed admin role stops working at once
const loadUser = async (req) => {
  const token = req.cookies?.[COOKIE]
  if (!token) return null
  try {
    const { userId } = jwt.verify(token, jwtSecret)
    return await User.findById(userId).select('-password')
  } catch {
    return null
  }
}

const authenticate = asyncHandler(async (req, res, next) => {
  const user = await loadUser(req)
  if (!user) throw new HttpError(401, 'Please sign in to continue')
  req.user = user
  next()
})

const authorizedAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) return next(new HttpError(403, 'Admin access only'))
  next()
}

module.exports = { authenticate, authorizedAdmin, loadUser }
