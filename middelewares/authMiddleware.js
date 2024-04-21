const jwt= require("jsonwebtoken")
const User = require('../models/userModel')

const authenticate= async (req,res,next)=>{

    let token = req.cookies.jwt
    
    if(token){
        try{
const decoded = jwt.verify(token, process.env.JWT_SECRETKEY)
req.user = await   User.findById(decoded.userId).select("-password")    
next()
}
        catch(error){
            res.status(401)
            throw new Error("Not authorized, token failed.")
        }
    }
    else{
        res.status(401)
        throw new Error("Not authorized , no token")
    }
}

//check for  the admin 

const authorizedAdmin = (req,res,next)=>{
    if(req.user && req.user.isAdmin)
    next()
else
res.status(401).send("not authorized as admin")
}

module.exports ={authenticate,authorizedAdmin}