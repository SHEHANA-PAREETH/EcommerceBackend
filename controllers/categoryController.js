const Category = require('../models/Category')
const Product = require('../models/Product')
const { asyncHandler, HttpError, requireId, text } = require('../utils/helpers')

// every category with how many products it holds
const listCategories = asyncHandler(async (req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Product.aggregate([{ $sort: { rating: -1, sold: -1 } }, { $group: { _id: '$category', count: { $sum: 1 }, image: { $first: '$image' } } }]),
  ])
  const byId = new Map(counts.map((entry) => [String(entry._id), entry]))
  res.json(categories.map((category) => ({ ...category, count: byId.get(String(category._id))?.count || 0, image: byId.get(String(category._id))?.image || '' })))
})

const createCategory = asyncHandler(async (req, res) => {
  const name = text(req.body.name, 40)
  if (!name) throw new HttpError(400, 'Category name is required')
  res.status(201).json(await Category.create({ name }))
})

const updateCategory = asyncHandler(async (req, res) => {
  const name = text(req.body.name, 40)
  if (!name) throw new HttpError(400, 'Category name is required')
  const category = await Category.findByIdAndUpdate(requireId(req.params.id), { name }, { new: true, runValidators: true })
  if (!category) throw new HttpError(404, 'Category not found')
  res.json(category)
})

const deleteCategory = asyncHandler(async (req, res) => {
  const id = requireId(req.params.id)
  // a product always needs a category, so a category that is still in use can't go
  const inUse = await Product.countDocuments({ category: id })
  if (inUse) throw new HttpError(409, `This category still has ${inUse} product${inUse > 1 ? 's' : ''}. Move or delete them first.`)
  const removed = await Category.findByIdAndDelete(id)
  if (!removed) throw new HttpError(404, 'Category not found')
  res.json({ message: 'Category deleted' })
})

module.exports = { listCategories, createCategory, updateCategory, deleteCategory }
