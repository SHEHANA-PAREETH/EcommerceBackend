const express = require("express")
const router = express.Router()
const { authenticate, authorizedAdmin } = require('../middelewares/authMiddleware')
const {createOrder,getAllOrders,getUserOrders,countTotalOrders,calculateTotalSales,calculateTotalSalesByDate,findOrderById,markOrderAsPaid,markOrderAsDeliver} = require("../controllers/orderController")

router.get('/',authenticate,authorizedAdmin,getAllOrders)
router.get('/mine',authenticate,getUserOrders)
router.get("/total-orders",countTotalOrders)
router.get('/total-sales',calculateTotalSales)
router.get('/total-sales-by-date',calculateTotalSalesByDate)
router.get('/:id',authenticate,findOrderById)
router.put('/:id/pay',authenticate,markOrderAsPaid)
router.put('/:id/deliver',authenticate,authorizedAdmin,markOrderAsDeliver)
router.post('/',authenticate,createOrder)
module.exports = router;

