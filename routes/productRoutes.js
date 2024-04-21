const express = require("express")
const { authenticate, authorizedAdmin } = require("../middelewares/authMiddleware")
const router = express.Router()
const {addProduct,updateProductDetails,deleteProduct,getAllProducts,getSingleProduct,fetchAllProducts,addProductReview,fetchTopProducts,getNewProducts,getPdtsBytCategory,getFavProducts,filterdProducts,getBrands} = require('../controllers/productController')
router.get('/allproducts',fetchAllProducts)
router.get('/getpdtsbytcategory/:categoryId',authenticate,getPdtsBytCategory)
router.get('/',getAllProducts)
router.post('/filterd-products',filterdProducts)
router.get('/top',fetchTopProducts)
router.get('/new',getNewProducts)
router.get('/brands',getBrands)
router.get('/:id',getSingleProduct)
router.get('/favpdts/:ids',authenticate,getFavProducts)

router.post('/',authenticate,authorizedAdmin,addProduct)
router.post('/:id/reviews',authenticate,addProductReview)

router.put('/:id',authenticate,authorizedAdmin,updateProductDetails)
router.delete("/:id",authenticate,authorizedAdmin,deleteProduct)


module.exports = router