const jwt = require('jsonwebtoken')

const generateToken=(res,userId)=>{
    const token = jwt.sign({userId},process.env.JWT_SECRETKEY,{
        expiresIn: "30d",
    })
  
/*res.cookie('jwt',token,{
        httpOnly: true,
        secure: process.env.NODE_ENV === "development",
       sameSite : "strict",
       maxAge: 30*24*60*60*1000
    })*/
    res.cookie('jwt', token, {
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      
    return token
}
module.exports = generateToken