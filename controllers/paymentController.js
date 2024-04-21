
const ORDER= require('../models/orderModel')
const stripe =require("stripe")("sk_test_51P65lNSC8qQELg2Ownxm0mEaT4LAg084I0t0WH83D5qozUA7tA7uHbV1rTc17nldZ4XEKrt6awhlfyvP1FZodmst00pVLqRztV")
const makePayment= async (req,res)=>{
    try {
        console.log(req.body);
       const {orderItems,id,email} = req.body
       //console.log(orderItems,id);
       const session = await stripe.checkout.sessions.create({
        payment_method_types:["card"],
        mode:"payment",
        line_items:orderItems.map((item)=>{
            return{
                price_data:{
                    currency:"inr",
                    product_data:{
                        name:item.name, 
                    },
                    unit_amount:Number(item.price.replace(/,/g, ''))*100,

                },
                quantity:Number(item.qty)
            }
        }),
        success_url:`${process.env.CLIENT_SITE_URL}/success/${id}`,
        cancel_url:`${process.env.CLIENT_SITE_URL}/failure`,
        customer_email: email, // Set the customer's email
    })

 
   
    res.status(200).json({success:true,message:"successfullly paid",session})
   
    } catch (error) {
        res.status(500).json({error:error.message})
        console.log(error);
    }
    
}

module.exports = {makePayment}