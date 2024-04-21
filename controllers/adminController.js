const express = require('express')
const User = require('../models/userModel')
const getAllUsers= async (req,res)=>{
  const users= await User.find({})
  res.json(users)
}
const deleteUserById= async (req,res)=>{
  console.log(req.params.id);
const user = await User.findById(req.params.id)
if(user){
if(user.isAdmin){
    res.status(400)
    throw new Error("cannot delete admin user");
}
await User.deleteOne({_id:user._id})
res.json({message:"User removed."})
}
else{
res.status(404)
throw new Error("No user found.")
} 

}

const getSingleUserById= async(req,res)=>{
const user = await User.findById(req.params.id).select("-password")
if(user){
  res.json(user)}
  else{
    res.status(404)
    throw new Error("User not found.")
  }
}
const updateUserById= async (req,res)=>{
  const user = await User.findById(req.params.id)
  if(user){
    user.username = req.body.username ||user.username
  user.email = req.body.email || user.email
  user.isAdmin = Boolean(req.body.isAdmin)
  const updatedUser = await user.save()
  res.json({
    _id:updatedUser._id,
    username: updatedUser.username,
    email: updatedUser.email,
    isAdmin: updatedUser.isAdmin

  })
  }
  else{
    res.status(404);
    throw new Error("User not found.")
  }
}
module.exports = {getAllUsers,deleteUserById,getSingleUserById,updateUserById}