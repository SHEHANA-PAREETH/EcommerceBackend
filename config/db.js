const mongoose = require('mongoose')
const { mongoUri } = require('./env')

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 })
    console.log(`MongoDB connected (database: ${conn.connection.name})`)
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`)
    process.exit(1)
  }
}

module.exports = connectDB
