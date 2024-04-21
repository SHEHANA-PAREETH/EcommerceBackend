const express = require('express')
const User = require('../models/userModel')
const bcrypt= require("bcrypt")
const createToken = require('../utils/createToken')


const createUser= async (req,res)=>{
    const {username,email,password} =req.body;
    //console.log(username);
    //console.log(email);
    //console.log(password);
    const salt= await bcrypt.genSalt(10)
const hashedPassword = await bcrypt.hash(password, salt)
    User({
        username: username,
        email: email,
        password: hashedPassword
    }).save().then((resp)=>{
        console.log(resp);
       createToken(res, resp._id)
       res.status(201).json({message:"successfully created account",_id:resp._id,username:resp.username,email:resp.email,isAdmin:resp.isAdmin})

    }).catch((error)=>{
        console.log(error);
        if(error.code === 11000){
            res.status(400).json({error:"email already exists"})
        }
        else{
            res.status(400).json({error:"invalid user data"})
        }
        
    })
}
const loginUser= async (req,res)=>{
   const{email,password} =req.body;
   const existingUser= await User.findOne({email})
   if(existingUser){
    const isPasswordValid = await bcrypt.compare(password,existingUser.password)
    if(isPasswordValid){
        let token = createToken(res,existingUser._id)
        //console.log(token,"created");
        res.status(201).json({
            _id:existingUser._id,
            username:existingUser.username,
            email:existingUser.email,
            isAdmin:existingUser.isAdmin
        })
        return;
    }
    else{
        res.status(400).json({error:"invalid password"})
    }
   }
   else{
    res.status(400).json({error:"email doesn't exist, create an account"})
   }
}
const logoutUser=(req,res)=>{
res.cookie('jwt','',{
    httpOnly : true,
    expires: new Date(0)
})
res.status(200).json({msg:"logout successfully"})
}
const getCurrentUserProfile= async (req,res)=>{
const user = await User.findById(req.user._id)
console.log(user);
if(user){
    res.json({
        _id:user._id,
        username:user.username,
        email:user.email
    })
}
else{
    res.status(404)
    throw new Error("User not found.")
}
}
const updateCurrentUserProfile= async (req,res)=>{
   const user =await User.findById(req.user._id)
   if(user){
    user.username = req.body.username || user.username
user.email = req.body.email || user.email
if(req.body.password){
    const salt= await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password,salt)
    user.password = hashedPassword
}
const updatedUser = await user.save()
res.json({
    _id:updatedUser._id,
    username:updatedUser.username,
    email:updatedUser.email,
    isAdmin:updatedUser.isAdmin

})
}
else{
    res.status(404)
    throw new Error("User not found.")
}
}

const getTotalUsers= async(req,res)=>{
    const users = await User.countDocuments()
    res.json(users)
}
module.exports = {createUser,loginUser,logoutUser,getCurrentUserProfile,updateCurrentUserProfile,getTotalUsers}