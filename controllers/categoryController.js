const CATEGORY = require("../models/categoryModal")
const createCategory= async(req,res)=>{
    try{
const {name} = req.body
console.log(name);
const existstingCategory = await CATEGORY.findOne({name:name})
if(existstingCategory){
   return res.satus(400).json({error:"already exists"})
}
const category= await new CATEGORY({name:name}).save()
res.json(category)
    }
    catch(error){
console.log(error);
 return res.status(400).json(error)
    }
}
const updateCategory= async(req,res)=>{
    try{
        const {name} = req.body;
        const {categoryId} = req.params
        console.log(name,categoryId);
        const category = await CATEGORY.findOne({_id:categoryId})
        
        console.log(category);
        if(!category){
            return res.status(404).json({error:"category not found"})
        }
        category.name = name;
        const updatedCategory = await category.save()
res.json(updatedCategory)
    }
    catch(error){
console.error(error)
res.status(500).json({error:"internal server error"})
    }
  

}
const getAllCategories= async (req,res)=>{
    try{
        const allcategories =  await CATEGORY.find()
        res.json(allcategories)
    }
    catch(error){
        console.log(error);
        return res.status(400).json(error.message)
    }
   
}
const getSingleCategory= async (req,res)=>{
    //console.log(req.params.id);
    try{
        const {id} = req.params
        const category = await CATEGORY.findById(id)
        res.json(category)
    }
    catch(error){
        console.log(error);
     return   res.status(400).json(error.message)
    }
}
const deleteCategory= async (req,res)=>{
    try{
        const {categoryId} = req.params
       const removed = await CATEGORY.findByIdAndDelete(categoryId)
    res.json(removed)
    }
    catch(error){
        console.log(error);
     return   res.status(400).json(error.message)
    }
}
module.exports = {createCategory,updateCategory,getAllCategories,getSingleCategory,deleteCategory}