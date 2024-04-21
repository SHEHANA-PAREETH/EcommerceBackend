const express = require("express")
const router = express.Router()

const { authenticate, authorizedAdmin } = require('../middelewares/authMiddleware')
const { makePayment } = require("../controllers/paymentController")
router.post('/checkout-session',authenticate,makePayment)
module.exports = router