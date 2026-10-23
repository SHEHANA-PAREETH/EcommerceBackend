const Order = require('../models/Order')
const Product = require('../models/Product')
const { stripeKey, currency, maxQtyPerItem, clientUrls } = require('../config/env')
const { priceOrder } = require('../utils/pricing')
const { asyncHandler, HttpError, requireId, text, pageParams } = require('../utils/helpers')

const stripe = stripeKey ? require('stripe')(stripeKey) : null

const PHONE = /^[0-9+()\-\s]{7,20}$/
function readAddress(input = {}) {
  const address = {
    fullName: text(input.fullName, 80),
    phone: text(input.phone, 20),
    address: text(input.address, 200),
    city: text(input.city, 80),
    state: text(input.state, 80),
    postalCode: text(input.postalCode, 12),
    country: text(input.country, 60) || 'India',
  }
  for (const [key, label] of [['fullName', 'full name'], ['address', 'address'], ['city', 'city'], ['postalCode', 'postal code']]) {
    if (!address[key]) throw new HttpError(400, `Please enter your ${label}`)
  }
  if (!PHONE.test(address.phone)) throw new HttpError(400, 'Please enter a valid phone number')
  return address
}

const accessibleOrder = async (req) => {
  const order = await Order.findById(requireId(req.params.id, 'order id')).populate('user', 'username email')
  if (!order) throw new HttpError(404, 'Order not found')
  const ownerId = String(order.user?._id || order.user)
  // someone else's order looks exactly like one that doesn't exist
  if (ownerId !== String(req.user._id) && !req.user.isAdmin) throw new HttpError(404, 'Order not found')
  return order
}

// give stock back (cancelled or abandoned orders)
const restock = (order) => Promise.all(order.orderItems.map((item) => Product.updateOne({ _id: item.product }, { $inc: { countInStock: item.qty, sold: -item.qty } })))

// ---------- customer ----------
const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, paymentMethod } = req.body
  if (!Array.isArray(orderItems) || orderItems.length === 0) throw new HttpError(400, 'Your cart is empty')
  if (orderItems.length > 30) throw new HttpError(400, 'Too many different items in one order')
  if (!['stripe', 'cod'].includes(paymentMethod)) throw new HttpError(400, 'Choose a payment method')
  if (paymentMethod === 'stripe' && !stripe) throw new HttpError(503, 'Card payments are not available right now. Choose cash on delivery.')
  const shippingAddress = readAddress(req.body.shippingAddress)

  // merge duplicates, then read the real products
  const wanted = new Map()
  for (const item of orderItems) {
    const id = requireId(item?.product || item?._id, 'product id')
    const qty = Number(item.qty)
    if (!Number.isInteger(qty) || qty < 1) throw new HttpError(400, 'Quantity must be a whole number')
    wanted.set(id, (wanted.get(id) || 0) + qty)
  }
  const products = await Product.find({ _id: { $in: [...wanted.keys()] } })
  if (products.length !== wanted.size) throw new HttpError(404, 'One of the products in your cart is no longer available')

  const lines = products.map((product) => {
    const qty = wanted.get(String(product._id))
    if (qty > maxQtyPerItem) throw new HttpError(400, `You can order at most ${maxQtyPerItem} of "${product.name}"`)
    return { name: product.name, qty, image: product.image, price: product.price, product: product._id }
  })

  // take the stock atomically; if any line can't be fulfilled, put back what was already taken
  const taken = []
  try {
    for (const line of lines) {
      const result = await Product.updateOne({ _id: line.product, countInStock: { $gte: line.qty } }, { $inc: { countInStock: -line.qty, sold: line.qty } })
      if (result.modifiedCount !== 1) throw new HttpError(409, `Sorry, "${line.name}" doesn't have enough stock for ${line.qty}`)
      taken.push(line)
    }
  } catch (error) {
    await Promise.all(taken.map((line) => Product.updateOne({ _id: line.product }, { $inc: { countInStock: line.qty, sold: -line.qty } })))
    throw error
  }

  try {
    const order = await Order.create({ user: req.user._id, orderItems: lines, shippingAddress, paymentMethod, ...priceOrder(lines) })
    res.status(201).json(order)
  } catch (error) {
    await Promise.all(taken.map((line) => Product.updateOne({ _id: line.product }, { $inc: { countInStock: line.qty, sold: -line.qty } })))
    throw error
  }
})

const myOrders = asyncHandler(async (req, res) => {
  res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 }))
})

const getOrder = asyncHandler(async (req, res) => res.json(await accessibleOrder(req)))

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await accessibleOrder(req)
  // only the buyer cancels here; an admin changes the status from the admin area
  if (String(order.user._id) !== String(req.user._id)) throw new HttpError(403, 'Only the buyer can cancel this order')
  if (order.status !== 'processing') throw new HttpError(400, 'This order has already been shipped or closed')
  if (order.isPaid) throw new HttpError(400, 'This order is already paid. Please contact support for a refund.')
  order.status = 'cancelled'
  order.cancelledAt = new Date()
  await order.save()
  await restock(order)
  res.json(order)
})

// ---------- card payment (Stripe Checkout) ----------
const startCheckout = asyncHandler(async (req, res) => {
  if (!stripe) throw new HttpError(503, 'Card payments are not available right now')
  const order = await accessibleOrder(req)
  if (String(order.user._id) !== String(req.user._id)) throw new HttpError(403, 'Only the buyer can pay for this order')
  if (order.paymentMethod !== 'stripe' || order.isPaid || order.status !== 'processing') throw new HttpError(400, 'This order can not be paid online')

  const toMinor = (amount) => Math.round(amount * 100)
  const line = (name, amount, quantity = 1) => ({ quantity, price_data: { currency, unit_amount: toMinor(amount), product_data: { name } } })
  const items = order.orderItems.map((item) => line(item.name, item.price, item.qty))
  if (order.shippingPrice > 0) items.push(line('Shipping', order.shippingPrice))
  items.push(line('GST (18%)', order.taxPrice))

  const base = clientUrls[0]
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: items,
    customer_email: order.user.email,
    metadata: { orderId: String(order._id) },
    success_url: `${base}/order/${order._id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/order/${order._id}?cancelled=1`,
  })
  res.json({ url: session.url })
})

// called when the buyer returns from Stripe. The payment is confirmed with Stripe itself, never trusted from the browser.
const verifyPayment = asyncHandler(async (req, res) => {
  if (!stripe) throw new HttpError(503, 'Card payments are not available right now')
  const order = await accessibleOrder(req)
  if (order.isPaid) return res.json(order)
  const sessionId = text(req.body.sessionId, 200)
  if (!sessionId.startsWith('cs_')) throw new HttpError(400, 'Missing payment session')

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.metadata?.orderId !== String(order._id)) throw new HttpError(400, 'This payment does not belong to this order')
  if (session.payment_status !== 'paid') throw new HttpError(402, 'The payment has not been completed')
  if (session.amount_total !== Math.round(order.totalPrice * 100)) throw new HttpError(400, 'The paid amount does not match the order')

  order.isPaid = true
  order.paidAt = new Date()
  order.paymentResult = { id: session.payment_intent ? String(session.payment_intent) : session.id, status: session.payment_status, update_time: new Date().toISOString(), emailAddress: session.customer_details?.email || order.user.email }
  await order.save()
  res.json(order)
})

// ---------- admin ----------
const allOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 15, 50)
  const filter = {}
  if (['processing', 'shipped', 'delivered', 'cancelled'].includes(req.query.status)) filter.status = req.query.status
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'username email'),
    Order.countDocuments(filter),
  ])
  res.json({ orders, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})

const updateStatus = asyncHandler(async (req, res) => {
  const order = await accessibleOrder(req)
  const next = text(req.body.status, 20)
  const allowed = { processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] }
  if (!allowed[order.status]?.includes(next)) throw new HttpError(400, `An order that is ${order.status} can't be marked as ${next}`)

  order.status = next
  if (next === 'shipped') order.shippedAt = new Date()
  if (next === 'delivered') {
    order.isDelivered = true
    order.deliveredAt = new Date()
    // cash on delivery is paid when it arrives
    if (!order.isPaid) { order.isPaid = true; order.paidAt = new Date(); order.paymentResult = { status: 'paid on delivery', update_time: new Date().toISOString() } }
  }
  if (next === 'cancelled') { order.cancelledAt = new Date(); await restock(order) }
  await order.save()
  res.json(order)
})

module.exports = { createOrder, myOrders, getOrder, cancelOrder, startCheckout, verifyPayment, allOrders, updateStatus, stripeReady: Boolean(stripe) }
