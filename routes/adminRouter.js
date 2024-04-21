const express = require("express")
const { authenticate, authorizedAdmin } = require("../middelewares/authMiddleware")
const {getAllUsers,deleteUserById,getSingleUserById,updateUserById} = require("../controllers/adminController")
const router = express.Router()
router.get('/',authenticate,authorizedAdmin,getAllUsers)
router.get('/:id',authenticate,authorizedAdmin,getSingleUserById)
router.put('/:id',authenticate,authorizedAdmin,updateUserById)
router.delete("/:id",authenticate,authorizedAdmin,deleteUserById)
module.exports = router