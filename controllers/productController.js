const mongoose = require('mongoose')
const Product = require('../models/Product')
const Category = require('../models/Category')
const Order = require('../models/Order')
const { savedPaths } = require('../middleware/upload')
const { asyncHandler, HttpError, requireId, isId, text, escapeRegex, pageParams } = require('../utils/helpers')

const SORTS = {
  new: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { rating: -1, numReviews: -1 },
  popular: { sold: -1, numReviews: -1 },
}
const withCategory = (query) => query.populate('category', 'name')

// ---------- reading ----------
function buildFilter(query) {
  const filter = {}
  const q = text(query.q || query.keyWord, 80)
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: rx }, { brand: rx }, { description: rx }]
  }
  if (isId(query.category)) filter.category = new mongoose.Types.ObjectId(query.category)
  const brands = text(query.brand, 400).split(',').map((b) => b.trim()).filter(Boolean)
  if (brands.length) filter.brand = { $in: brands }
  const min = Number(query.minPrice)
  const max = Number(query.maxPrice)
  if (Number.isFinite(min) && query.minPrice !== '') filter.price = { ...filter.price, $gte: min }
  if (Number.isFinite(max) && query.maxPrice !== '') filter.price = { ...filter.price, $lte: max }
  const rating = Number(query.rating)
  if (rating > 0) filter.rating = { $gte: Math.min(rating, 5) }
  if (query.inStock === '1') filter.countInStock = { $gt: 0 }
  if (query.deals === '1') filter.$expr = { $gt: ['$mrp', '$price'] }
  return filter
}

const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query)
  const filter = buildFilter(req.query)
  const sort = SORTS[req.query.sort] || SORTS.new
  const [products, total] = await Promise.all([
    withCategory(Product.find(filter).select('-reviews').sort(sort).skip(skip).limit(limit)),
    Product.countDocuments(filter),
  ])
  res.json({ products, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})

// brands, price range and category counts for the filter panel (ignoring the filters being chosen)
const facets = asyncHandler(async (req, res) => {
  const match = {}
  if (isId(req.query.category)) match.category = new mongoose.Types.ObjectId(req.query.category)
  const q = text(req.query.q, 80)
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); match.$or = [{ name: rx }, { brand: rx }, { description: rx }] }
  const [brands, range] = await Promise.all([
    Product.aggregate([{ $match: match }, { $group: { _id: '$brand', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 40 }]),
    Product.aggregate([{ $match: match }, { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }]),
  ])
  res.json({ brands: brands.map((b) => ({ name: b._id, count: b.count })), minPrice: Math.floor(range[0]?.min || 0), maxPrice: Math.ceil(range[0]?.max || 0) })
})

// everything the home page needs in one request
const homeFeed = asyncHandler(async (req, res) => {
  const list = (filter, sort, limit) => withCategory(Product.find(filter).select('-reviews').sort(sort).limit(limit))
  const [fresh, top, dealIds, popular] = await Promise.all([
    list({}, { createdAt: -1 }, 10),
    list({ numReviews: { $gt: 0 } }, { rating: -1, numReviews: -1 }, 10),
    Product.aggregate([
      { $match: { $expr: { $gt: ['$mrp', '$price'] }, countInStock: { $gt: 0 } } },
      { $addFields: { off: { $divide: [{ $subtract: ['$mrp', '$price'] }, '$mrp'] } } },
      { $sort: { off: -1 } }, { $limit: 10 }, { $project: { _id: 1 } },
    ]),
    list({}, { sold: -1, numReviews: -1 }, 10),
  ])
  const order = dealIds.map((entry) => String(entry._id))
  const found = await withCategory(Product.find({ _id: { $in: order } }).select('-reviews'))
  const deals = found.sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)))
  res.json({ new: fresh, top, deals, popular })
})

const suggest = asyncHandler(async (req, res) => {
  const q = text(req.query.q, 60)
  if (q.length < 2) return res.json([])
  const rx = new RegExp(escapeRegex(q), 'i')
  const products = await Product.find({ $or: [{ name: rx }, { brand: rx }] }).select('name image price brand').sort({ sold: -1 }).limit(6)
  res.json(products)
})

const getProduct = asyncHandler(async (req, res) => {
  const product = await withCategory(Product.findById(requireId(req.params.id, 'product id')))
  if (!product) throw new HttpError(404, 'Product not found')
  res.json(product)
})

const relatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(requireId(req.params.id, 'product id')).select('category')
  if (!product) throw new HttpError(404, 'Product not found')
  res.json(await withCategory(Product.find({ category: product.category, _id: { $ne: product._id } }).select('-reviews').sort({ rating: -1 }).limit(8)))
})

// the wishlist lives in the browser as a list of ids; this turns them back into products
const productsByIds = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(isId).slice(0, 100) : []
  const products = await withCategory(Product.find({ _id: { $in: ids } }).select('-reviews'))
  res.json(products)
})

// ---------- reviews ----------
const addReview = asyncHandler(async (req, res) => {
  const rating = Number(req.body.rating)
  const comment = text(req.body.comment, 1000)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Choose a rating from 1 to 5')
  if (comment.length < 3) throw new HttpError(400, 'Please write a short comment')

  const product = await Product.findById(requireId(req.params.id, 'product id'))
  if (!product) throw new HttpError(404, 'Product not found')
  if (product.reviews.some((review) => String(review.user) === String(req.user._id))) throw new HttpError(409, 'You have already reviewed this product')

  const bought = await Order.exists({ user: req.user._id, 'orderItems.product': product._id, status: { $ne: 'cancelled' } })
  product.reviews.push({ name: req.user.username, rating, comment, user: req.user._id, verified: Boolean(bought) })
  product.numReviews = product.reviews.length
  product.rating = Math.round((product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length) * 10) / 10
  await product.save()
  res.status(201).json({ message: 'Thanks for your review' })
})

// ---------- admin writing ----------
async function readProductFields(body, partial = false) {
  const fields = {}
  const set = (key, value) => { if (value !== undefined) fields[key] = value }
  const required = (key, value) => { if (!partial && !value && value !== 0) throw new HttpError(400, `${key} is required`) }

  const name = text(body.name, 160); required('Name', name); if (name) set('name', name)
  const brand = text(body.brand, 60); required('Brand', brand); if (brand) set('brand', brand)
  const description = text(body.description, 4000); required('Description', description); if (description) set('description', description)
  if (body.category !== undefined || !partial) {
    const category = requireId(body.category, 'category')
    if (!(await Category.exists({ _id: category }))) throw new HttpError(400, 'That category does not exist')
    set('category', category)
  }
  for (const key of ['price', 'mrp', 'countInStock']) {
    if (body[key] === undefined || body[key] === '') {
      if (key === 'mrp') { if (body.mrp === '') set('mrp', 0); continue }
      if (!partial) throw new HttpError(400, `${key === 'price' ? 'Price' : 'Stock'} is required`)
      continue
    }
    const value = Number(body[key])
    if (!Number.isFinite(value) || value < 0) throw new HttpError(400, `${key} must be a positive number`)
    set(key, key === 'countInStock' ? Math.floor(value) : Math.round(value * 100) / 100)
  }
  return fields
}

const createProduct = asyncHandler(async (req, res) => {
  const fields = await readProductFields(req.body)
  const uploaded = await savedPaths(req.files)
  if (!uploaded.length) throw new HttpError(400, 'Add at least one product image')
  const product = await Product.create({ ...fields, image: uploaded[0], images: uploaded })
  res.status(201).json(product)
})

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(requireId(req.params.id, 'product id'))
  if (!product) throw new HttpError(404, 'Product not found')
  Object.assign(product, await readProductFields(req.body, true))

  // `keep` lists the existing pictures that stay; new uploads are added after them
  let keep = product.images.length ? product.images : [product.image]
  if (req.body.keep !== undefined) {
    let wanted = []
    try { wanted = JSON.parse(req.body.keep) } catch { throw new HttpError(400, 'Invalid image list') }
    keep = keep.filter((url) => Array.isArray(wanted) && wanted.includes(url))
  }
  const images = [...keep, ...(await savedPaths(req.files))]
  if (!images.length) throw new HttpError(400, 'A product needs at least one image')
  product.images = images
  product.image = images[0]
  await product.save()
  res.json(product)
})

const deleteProduct = asyncHandler(async (req, res) => {
  const removed = await Product.findByIdAndDelete(requireId(req.params.id, 'product id'))
  if (!removed) throw new HttpError(404, 'Product not found')
  res.json({ message: 'Product deleted' })
})

module.exports = { listProducts, facets, homeFeed, suggest, getProduct, relatedProducts, productsByIds, addReview, createProduct, updateProduct, deleteProduct }
