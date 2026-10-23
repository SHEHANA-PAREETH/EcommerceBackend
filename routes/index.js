const express = require('express')
const { authenticate, authorizedAdmin, loadUser } = require('../middleware/auth')
const { asyncHandler, publicUser } = require('../utils/helpers')
const { uploadImages } = require('../middleware/upload')
const user = require('../controllers/userController')
const admin = require('../controllers/adminController')
const category = require('../controllers/categoryController')
const product = require('../controllers/productController')
const order = require('../controllers/orderController')
const { authLimiter } = require('../middleware/security')

const router = express.Router()
const adminOnly = [authenticate, authorizedAdmin]

router.get('/config', (req, res) => res.json({ card: order.stripeReady, currency: 'INR' }))

// accounts
router.post('/users', authLimiter, user.createUser)
router.post('/users/auth', authLimiter, user.loginUser)
router.post('/users/logout', user.logoutUser)
// who is signed in right now: the user, or null for a visitor (200 either way, so the browser console stays clean)
router.get('/users/session', asyncHandler(async (req, res) => { const found = await loadUser(req); res.json(found ? publicUser(found) : null) }))
router.get('/users/profile', authenticate, user.getProfile)
router.put('/users/profile', authenticate, authLimiter, user.updateProfile)

// categories
router.get('/category', category.listCategories)
router.post('/category', ...adminOnly, category.createCategory)
router.put('/category/:id', ...adminOnly, category.updateCategory)
router.delete('/category/:id', ...adminOnly, category.deleteCategory)

// products
router.get('/product', product.listProducts)
router.get('/product/facets', product.facets)
router.get('/product/home', product.homeFeed)
router.get('/product/suggest', product.suggest)
router.post('/product/byids', product.productsByIds)
router.post('/product', ...adminOnly, uploadImages, product.createProduct)
router.get('/product/:id', product.getProduct)
router.get('/product/:id/related', product.relatedProducts)
router.post('/product/:id/reviews', authenticate, product.addReview)
router.put('/product/:id', ...adminOnly, uploadImages, product.updateProduct)
router.delete('/product/:id', ...adminOnly, product.deleteProduct)

// orders
router.post('/orders', authenticate, order.createOrder)
router.get('/orders/mine', authenticate, order.myOrders)
router.get('/orders', ...adminOnly, order.allOrders)
router.get('/orders/:id', authenticate, order.getOrder)
router.put('/orders/:id/cancel', authenticate, order.cancelOrder)
router.post('/orders/:id/checkout', authenticate, order.startCheckout)
router.post('/orders/:id/verify-payment', authenticate, order.verifyPayment)
router.put('/orders/:id/status', ...adminOnly, order.updateStatus)

// admin
router.get('/admin/stats', ...adminOnly, admin.stats)
router.get('/admin/users', ...adminOnly, admin.listUsers)
router.put('/admin/users/:id', ...adminOnly, admin.setRole)
router.delete('/admin/users/:id', ...adminOnly, admin.deleteUser)

module.exports = router
