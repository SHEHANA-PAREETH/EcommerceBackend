const express = require('express')
const {createUser,loginUser,logoutUser, getCurrentUserProfile,updateCurrentUserProfile,getTotalUsers}= require('../controllers/userController')
const { authenticate, authorizedAdmin } = require('../middelewares/authMiddleware')
const router = express.Router()

router.post('/',createUser)
router.get('/totalusers',authenticate,authorizedAdmin,getTotalUsers)
router.post('/auth',loginUser)
router.post('/logout',authenticate,logoutUser)
router.get('/profile',authenticate,getCurrentUserProfile)
router.put('/profile',authenticate,updateCurrentUserProfile)
module.exports =router