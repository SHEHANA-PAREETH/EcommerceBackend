const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, default: '' },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: { type: String, enum: ['stripe', 'cod'], required: true },
    paymentResult: { id: String, status: String, update_time: String, emailAddress: String },
    itemsPrice: { type: Number, required: true },
    taxPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    status: { type: String, enum: ['processing', 'shipped', 'delivered', 'cancelled'], default: 'processing', index: true },
    shippedAt: Date,
    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
)

module.exports = mongoose.model('Order', orderSchema)
