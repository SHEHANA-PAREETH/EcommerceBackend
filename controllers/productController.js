const express= require("express")
const PRODUCT = require('../models/productModal')
const multer= require('multer');


// Define storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/uploads/'); // Destination folder for uploaded files
    },
    filename: (req, file, cb) => {
      cb(null,Date.now() + '-' + file.originalname); // Rename the file to include the timestamp
    },
  });
  
  // Initialize Multer with the storage configuration
 

const addProduct= async (req,res)=>{
  try{
const {name,description,price,category,quantity,brand}= req.body
//console.log(name,price,description,quantity,category,brand);  

const upload = multer({ storage: storage }).single('image');
  upload(req,res,(err)=>{
    console.log(req.file);
    
   console.log(req.body);
   const product = new PRODUCT({...req.body,image:req.file.filename})
product.save().then((resp)=>{
    console.log(resp);
    res.json({msg:"added successfully"})
})
 })
  

}
  catch(error){
    console.error(error)
    res.status(400).json(error.message)
  }
}
const updateProductDetails= async (req,res)=>{
    try{
        const upload = multer({ storage: storage }).single('image');
        upload(req,res,(err)=>{
            console.log(req.body);
PRODUCT.findByIdAndUpdate(req.params.id,{...req.body,image:req?.file?.filename},{new:true}).then((updatedproduct)=>{
    res.json({updatedproduct,msg:"updated suuccessfully"}) 
})
 
})}
    catch(error){
console.log(error);
res.status(400).json(error.message)
    }
}
const deleteProduct= async (req,res)=>{
    try{
        const removedProduct= await PRODUCT.findByIdAndDelete(req.params.id)
res.json({removedProduct:removedProduct,msg:"deleted successfully"})
      }
    catch(error){
console.log(error);
res.status(400).json(error.message)
    }
    
}
const getAllProducts= async (req,res)=>{
    try{
        const pageSize = 6;
        const keyWord = req.query.keyWord ? {name: {$regex: req.query.keyWord,$options:"i"}}:{}
        const count = await PRODUCT.countDocuments({...keyWord})
        const allProducts = await PRODUCT.find({...keyWord}).limit(pageSize)
      console.log(allProducts);
      res.json({allProducts,page:1,pages:Math.ceil(count/pageSize),hasMore:false})
      }
    catch(error){
console.log(error);
res.status(500).json({error:"servor error"})
    }
}
const getSingleProduct= async(req,res)=>{
try{
const product = await PRODUCT.findById(req.params.id).populate('category')

if(product){
    return res.status(200).json(product)
}
else{
    res.status(404)
    throw new Error("product not found")
}
}
catch(error){
    console.log(error);
    res.status(404).json({error:"product not found"})
}
}

const fetchAllProducts = async (req,res)=>{
   
   try{
const products = await PRODUCT.find().populate('category').limit(12).sort({createdAt:-1})
res.json(products)
    }
    catch(error){
        console.log(error);
res.status(500).json({error:"servor error"})
    }
}
const addProductReview= async (req,res)=>{
    try{
const {rating,comment} = req.body
const product = await PRODUCT.findById(req.params.id)
if(product){
    const alreadyReviewed = product.reviews.find((review)=>review.user.toString() === req.user._id.toString())
    if(alreadyReviewed){
        res.status(400)
        throw new Error("product already reviewed")
    }
    const review= {
        name:req.user.username,
        rating:Number(rating),
        comment,
        user: req.user._id
    }
    product.reviews.push(review)
    product.numReviews=product.reviews.length
    product.rating = product.reviews.reduce((acc,item)=>item.rating+acc,0)/product.reviews.length
    await product.save()
    res.status(201).json({message:"review added"})
}
else{
    res.status(404)
    throw new Error("pdt not found")
}
    }
    catch(error){
        console.log(error);
        res.status(400).json(error.message)
    }
}
const fetchTopProducts= async(req,res)=>{
  try{
 const products = await PRODUCT.find({}).sort({rating: -1}).limit(4)
 res.json(products)
  }
  catch(error){
res.status(400).json({error:error.message})
  }
}

const getNewProducts =async (req,res)=>{
    try{
        const products = await PRODUCT.find({}).sort({_id:-1}).limit(5)
        res.json(products)
         }
         catch(error){
       res.status(400).json({error:error.message})
         }
}
const getPdtsBytCategory= async(req,res)=>{
    console.log(req.params.categoryId);
    const pdts = await PRODUCT.find({category:req.params.categoryId}).populate('category')
    console.log(pdts);
res.json({msg:"ok",pdts:pdts})
}
const getFavProducts=  (req,res)=>{
    let results = [];
    const ids = req.params.ids.split(",");
    
    // Use map to create an array of promises
    const promises = ids.map(async (id) => {
        const result = await PRODUCT.findById(id);
        return result;
    });
    
    // Wait for all promises to resolve
    Promise.all(promises)
        .then((resolvedResults) => {
            results = resolvedResults;
            console.log(results); // Log the results after all promises are resolved
            res.json(results)
        })
        .catch((error) => {
            console.error(error);
        });
    

}

const filterdProducts= async (req,res)=>{
try{
console.log(req.body);
const {category,brand,price} = req.body;

let pdts;
if(category){
    
    pdts = await PRODUCT.find().populate("category")
}
if(price){
    pdts  = await PRODUCT.find({price:{$lte:price}}).populate("category")
}

if(brand){
   pdts  = await PRODUCT.find({brand:brand}).populate("category")
}
if(price&& brand){
    pdts  = await PRODUCT.find({brand:brand},{price:{$lte:price}}).populate("category")
}




const categorisedpdts= [];
for(let i=0;i<pdts?.length;i++){
    if(pdts[i].category.name.includes(category))
categorisedpdts.push(pdts[i])

}
console.log(categorisedpdts);
res.json(categorisedpdts)
}
catch(error){
    console.error(error)
    res.status(500).json({error:"server error"})
}
}

const getBrands= async (req,res)=>{
    try{
        const {category} = req.query;
        console.log(category);
      const products =await PRODUCT.find().populate("category")
      //console.log(products);
     const newproducts = products.map((pdt)=>pdt.category.name === category && pdt)
     console.log(newproducts);
     const brands=[]
        for (let i=0;i<newproducts.length;i++)
        brands.push(newproducts[i].brand)
    console.log(brands);
     res.json({brands:brands,newproducts:newproducts})
/*console.log(products);
        const brands=[]
        for (let i=0;i<products.length;i++)
        brands.push(products[i].brand.trim())
    console.log(brands);
    res.json({brands:brands})*/
        }
        catch(error){
            console.error(error)
            res.status(500).json({error:"server error"})
        }
}
module.exports = {addProduct,updateProductDetails,deleteProduct,getAllProducts,getSingleProduct,fetchAllProducts,addProductReview,fetchTopProducts,getNewProducts,getPdtsBytCategory,getFavProducts,filterdProducts,getBrands}