const Order =  require('../models/orderModel')
const PRODUCT = require('../models/productModal')

function calPrices(orderItems){
    const itemsPrice= orderItems.reduce((acc,item)=>acc+Number(item.price.replace(/,/g, ''))*Number(item.qty),0)

    const shippingPrice = itemsPrice > 100 ? 0:10;
    const taxRate = 0.15;
    const taxPrice = (itemsPrice *taxRate).toFixed(2)

    const totalPrice = (itemsPrice+shippingPrice+parseFloat(taxPrice)).toFixed(2)
    
    return{
        itemsPrice: itemsPrice.toFixed(2),
        shippingPrice: shippingPrice.toFixed(2),
        taxPrice,
        totalPrice
    }
}

const createOrder= async (req,res)=>{
try{
    
const {orderItems,shippingAddress,paymentMethod}= req.body
//console.log(orderItems,shippingAddress,paymentMethod);
if(orderItems&& orderItems.length === 0){
    res.status(400)
    throw new Eroor('No order items')
}

const itemsFromDb = await PRODUCT.find({
    _id:{$in:orderItems.map((x)=>x._id)}
})

const dbOrderItems = orderItems.map((itemFromClient)=>{
    const matchingItemFromDB = itemsFromDb.find((item)=>item._id.toString()=== itemFromClient._id)

if(!matchingItemFromDB){
    res.status(404)
    throw new Eroor(`pdt not found:${itemFromClient}`)
}

return {
    name:itemFromClient.name,
    qty:itemFromClient.qty,
    image:itemFromClient.image,
    price: matchingItemFromDB.price,
    product:itemFromClient._id,
   
    
}


})

const {itemsPrice,taxPrice,shippingPrice,totalPrice}=calPrices(dbOrderItems)
//console.log(itemsPrice,taxPrice,shippingPrice,totalPrice);
//console.log(dbOrderItems);
const order = new Order({
    orderItems:dbOrderItems,
    user:req.user._id,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice
})
order.save().then((resp)=>{
    //console.log(resp);
    res.status(201).json(resp)
}).catch(error=>{
    console.log(error);
})
/*const createdOrder = await order.save()
console.log(createdOrder);
res.status(201).json(createdOrder)*/
}
catch(error){
    res.status(500).json({error:error.message})
}
}
const getAllOrders= async (req,res)=>{
try{
    const orders = await Order.aggregate([
        { $unwind: '$orderItems' }, // Split the orderItems array into separate documents
        
        { $sort: { createdAt: -1 } }, // Sort by createdAt in descending order
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } }, // Populate the user field
        { $unwind: '$user' } // Unwind the user array (since lookup returns an array)
      ]);
      
      console.log(orders);
      
//
res.status(200).json(orders)
}
catch(error){
    res.status(500).json({error:error.message})
}
}
const getUserOrders= async(req,res)=>{
try{
const orders = await Order.find({user:req.user._id}).sort({createdAt:-1}).populate("user")
res.json(orders)
}
catch(error){
    res.status(500).json({error:error.message})
}
}
const countTotalOrders=async(req,res)=>{
    try{
        const totalOrders = await Order.countDocuments()
        res.json({totalOrders})
        }
        catch(error){
            res.status(500).json({error:error.message})
        }  
}

const calculateTotalSales= async(req,res)=>{
    try{
        const orders = await Order.find()
        const totalSales = orders.reduce((sum,order)=>sum+order.totalPrice,0)
        res.json({totalSales})
    }
    catch(error){
        res.status(500).json({error:error.message})
    }
}
const calculateTotalSalesByDate=async(req,res)=>{
    try{
        const salesByDate = await Order.aggregate([
            {
                $match:{
                    isPaid:true
                }
            },
            {
               $group:{
                _id:{
                    $dateToString: {format:'%Y-%m-%d',date:"$paidAt"}
                },
                totalSales:{
                    $sum:"$totalPrice"
                }
               }
            }
           
        ])
    
        res.json({salesByDate})
    }
    catch(error){
        res.status(500).json({error:error.message})
    }
}
const findOrderById= async(req,res)=>{
    try{
        const order = await Order.findById(req.params.id).populate("user","username email")
        if(order){
            res.json(order)
        }
        else{
            res.status(404)
            throw new Error("order not found")
        }
    }
    catch(error){
        res.status(500).json({error:error.message})
    } 
}
const markOrderAsPaid= async(req,res)=>{
    try{
        const order = await Order.findById(req.params.id)
        if(order){
            order.isPaid=true;
          order.paidAt = Date.now()
order.paymentResult ={
    id:req.body.id,
    status:req.body.status,
    update_time:req.body.update_time,
    emailAddress:req.body.emailAddress
}
const updateOrder = await order.save()
            res.status(200).json(updateOrder)
        }
        else{
            res.status(404)
            throw new Error("order not found")
        }
    }
    catch(error){
        res.status(500).json({error:error.message})
    }   
}
const markOrderAsDeliver=async(req,res)=>{
try{
    const order = await Order.find(req.params.id)
    if(order){
        order.isDelivered = true;
        order.deliveredAt= Date.now()

        const updatedOrder = await order.save()
        res.json(updatedOrder)
    }
    else{
        res.status(404)
        throw new Error("order not found")
    }
}
catch(error){
    res.status(500).json({error:error.message})
}   

}
module.exports ={createOrder,getAllOrders,getUserOrders,countTotalOrders,calculateTotalSales,calculateTotalSalesByDate,findOrderById,markOrderAsPaid,markOrderAsDeliver}
