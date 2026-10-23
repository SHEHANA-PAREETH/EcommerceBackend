const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40, unique: true },
})

module.exports = mongoose.model('category', categorySchema)
