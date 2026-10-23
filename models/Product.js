const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 1000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
)

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    // main picture first; a value is either a full URL or a path under /uploads
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    brand: { type: String, required: true, trim: true, maxlength: 60 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'category', required: true, index: true },
    description: { type: String, required: true, maxlength: 4000 },
    price: { type: Number, required: true, min: 0 },
    // the "was" price, shown struck through when higher than price
    mrp: { type: Number, default: 0, min: 0 },
    countInStock: { type: Number, required: true, default: 0, min: 0 },
    reviews: [reviewSchema],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
  },
  { timestamps: true },
)

productSchema.index({ name: 'text', brand: 'text' })
productSchema.virtual('discount').get(function discount() {
  return this.mrp > this.price ? Math.round(((this.mrp - this.price) / this.mrp) * 100) : 0
})
productSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { delete ret.id; return ret } })

module.exports = mongoose.model('product', productSchema)
