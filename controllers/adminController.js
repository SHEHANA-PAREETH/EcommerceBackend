const User = require('../models/User')
const Order = require('../models/Order')
const Product = require('../models/Product')
const { asyncHandler, HttpError, requireId, text, escapeRegex, pageParams, publicUser } = require('../utils/helpers')

const DAYS = 14

const stats = asyncHandler(async (req, res) => {
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - (DAYS - 1))

  const live = { status: { $ne: 'cancelled' } }
  const [users, products, orders, revenue, byDay, byStatus, topProducts, lowStock, recentOrders] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([{ $match: { ...live, isPaid: true } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
    Order.aggregate([
      { $match: { ...live, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sales: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: live }, { $unwind: '$orderItems' },
      { $group: { _id: '$orderItems.product', name: { $first: '$orderItems.name' }, image: { $first: '$orderItems.image' }, qty: { $sum: '$orderItems.qty' } } },
      { $sort: { qty: -1 } }, { $limit: 5 },
    ]),
    Product.find({ countInStock: { $lte: 5 } }).select('name image countInStock').sort({ countInStock: 1 }).limit(6),
    Order.find().sort({ createdAt: -1 }).limit(6).populate('user', 'username email'),
  ])

  // fill the days with no orders so the chart has no gaps
  const found = new Map(byDay.map((day) => [day._id, day]))
  const series = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(since)
    date.setUTCDate(since.getUTCDate() + i)
    const key = date.toISOString().slice(0, 10)
    return { date: key, sales: found.get(key)?.sales || 0, orders: found.get(key)?.orders || 0 }
  })

  res.json({
    totals: { users, products, orders, revenue: revenue[0]?.total || 0 },
    series,
    byStatus: Object.fromEntries(byStatus.map((entry) => [entry._id, entry.count])),
    topProducts: topProducts.map((p) => ({ _id: p._id, name: p.name, image: p.image, qty: p.qty })),
    lowStock,
    recentOrders,
  })
})

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 15, 50)
  const q = text(req.query.q, 60)
  const filter = q ? { $or: [{ username: new RegExp(escapeRegex(q), 'i') }, { email: new RegExp(escapeRegex(q), 'i') }] } : {}
  const [users, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ])
  const spend = await Order.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$totalPrice' } } },
  ])
  const byUser = new Map(spend.map((entry) => [String(entry._id), entry]))
  res.json({
    users: users.map((user) => ({ ...user, orders: byUser.get(String(user._id))?.orders || 0, spent: byUser.get(String(user._id))?.spent || 0 })),
    total, page, pages: Math.max(1, Math.ceil(total / limit)),
  })
})

const setRole = asyncHandler(async (req, res) => {
  const id = requireId(req.params.id, 'user id')
  if (typeof req.body.isAdmin !== 'boolean') throw new HttpError(400, 'isAdmin must be true or false')
  if (id === String(req.user._id)) throw new HttpError(400, "You can't change your own role")
  const user = await User.findByIdAndUpdate(id, { isAdmin: req.body.isAdmin }, { new: true }).select('-password')
  if (!user) throw new HttpError(404, 'User not found')
  res.json(publicUser(user))
})

const deleteUser = asyncHandler(async (req, res) => {
  const id = requireId(req.params.id, 'user id')
  const user = await User.findById(id)
  if (!user) throw new HttpError(404, 'User not found')
  if (user.isAdmin) throw new HttpError(400, 'Remove the admin role before deleting this account')
  await user.deleteOne()
  res.json({ message: 'User deleted' })
})

module.exports = { stats, listUsers, setRole, deleteUser }
