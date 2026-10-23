const bcrypt = require('bcrypt')
const User = require('../models/User')
const { asyncHandler, HttpError, text, issueSession, clearSession, publicUser } = require('../utils/helpers')

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const checkPassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters')
  if (password.length > 72) throw new HttpError(400, 'Password must be 72 characters or fewer')
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new HttpError(400, 'Password needs at least one letter and one number')
}

const createUser = asyncHandler(async (req, res) => {
  const username = text(req.body.username, 50)
  const email = text(req.body.email, 120).toLowerCase()
  const { password } = req.body
  if (username.length < 2) throw new HttpError(400, 'Please enter your name')
  if (!EMAIL.test(email)) throw new HttpError(400, 'Please enter a valid email address')
  checkPassword(password)
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists')

  const user = await User.create({ username, email, password: await bcrypt.hash(password, 10) })
  issueSession(res, user._id)
  res.status(201).json(publicUser(user))
})

const loginUser = asyncHandler(async (req, res) => {
  const email = text(req.body.email, 120).toLowerCase()
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  const user = email && password ? await User.findOne({ email }) : null
  // same message for "no such email" and "wrong password" so accounts can't be probed
  if (!user || !(await bcrypt.compare(password, user.password))) throw new HttpError(401, 'Incorrect email or password')
  issueSession(res, user._id)
  res.json(publicUser(user))
})

const logoutUser = (req, res) => {
  clearSession(res)
  res.json({ message: 'Signed out' })
}

const getProfile = (req, res) => res.json(publicUser(req.user))

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  const username = text(req.body.username, 50)
  const email = text(req.body.email, 120).toLowerCase()
  const { password, currentPassword } = req.body

  if (username) {
    if (username.length < 2) throw new HttpError(400, 'Name is too short')
    user.username = username
  }
  const emailChanged = email && email !== user.email
  // changing the email or the password needs the current password, so a stolen session can't take over the account
  if (emailChanged || password) {
    if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new HttpError(400, 'Enter your current password to change your email or password')
    }
  }
  if (emailChanged) {
    if (!EMAIL.test(email)) throw new HttpError(400, 'Please enter a valid email address')
    if (await User.exists({ email, _id: { $ne: user._id } })) throw new HttpError(409, 'That email is already in use')
    user.email = email
  }
  if (password) {
    checkPassword(password)
    user.password = await bcrypt.hash(password, 10)
  }
  await user.save()
  res.json(publicUser(user))
})

module.exports = { createUser, loginUser, logoutUser, getProfile, updateProfile }
