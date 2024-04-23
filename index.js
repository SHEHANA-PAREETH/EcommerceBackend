const express = require("express")
const cors = require('cors')
const cookieParser = require('cookie-parser')
const userRoutes = require('./routes/userRoutes')
const adminRouter= require('./routes/adminRouter')
const orderRoutes = require('./routes/orderRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const productRoutes = require ('./routes/productRoutes')
const dotenv = require('dotenv')
const paymentRouter = require('./routes/paymentRouter')
dotenv.config()
const connectDB = require('./config/db')
connectDB()
const app = express()


app.use(cors({
    origin:["http://localhost:3000"],
credentials:true
}))
app.use(express.static('public'));
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.get('/',(req,res)=>{
    res.send('hiiii')
})
app.use('/api/users',userRoutes)
app.use('/api/admin',adminRouter)
app.use('/api/category',categoryRoutes)
app.use('/api/product',productRoutes)
app.use('/api/orders',orderRoutes)
app.use('/api/config/stripe',paymentRouter)
const PORT=  5000;
app.listen(PORT,()=>{
    console.log("server startted");
})