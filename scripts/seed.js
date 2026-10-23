// Fills the database with a demo catalogue, an admin, some customers and sample orders.
//   node scripts/seed.js --reset       wipe the shop collections, then seed
//   node scripts/seed.js               seed only when the database is empty
// Product data comes from the free dummyjson.com API (prices are converted from USD to INR).
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const { mongoUri } = require('../config/env')
const User = require('../models/User')
const Category = require('../models/Category')
const Product = require('../models/Product')
const Order = require('../models/Order')
const { priceOrder } = require('../utils/pricing')

const ADMIN = { username: 'Shop Admin', email: 'admin@shopora.test', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@2026!' }
const SHOPPER = { username: 'Demo Shopper', email: 'shopper@shopora.test', password: process.env.SEED_SHOPPER_PASSWORD || 'Shopper@2026!' }

const CATEGORIES = [
  ['smartphones', 'Smartphones'], ['laptops', 'Laptops'], ['mobile-accessories', 'Accessories'], ['mens-shirts', "Men's Fashion"],
  ['womens-dresses', "Women's Fashion"], ['mens-shoes', 'Footwear'], ['womens-bags', 'Bags'], ['mens-watches', 'Watches'],
  ['sunglasses', 'Sunglasses'], ['beauty', 'Beauty'], ['fragrances', 'Fragrances'], ['furniture', 'Furniture'],
  ['home-decoration', 'Home Decor'], ['kitchen-accessories', 'Kitchen'], ['sports-accessories', 'Sports'],
]
const PER_CATEGORY = 8
const USD_TO_INR = 83
// dummyjson has no brand for some categories, so those get a house brand
const HOUSE = { Kitchen: ['CookWell', 'Casa Verde'], Sports: ['ProMotion', 'Arena'], 'Home Decor': ['Nordic Home', 'Casa Verde'], "Women's Fashion": ['Aura', 'Velvet & Co'], "Men's Fashion": ['Urban Edge', 'Northline'], Footwear: ['Stride', 'Urban Edge'], Bags: ['Aura', 'Velvet & Co'], Furniture: ['Nordic Home', 'Oakline'], Accessories: ['Volt', 'PowerGrid'], Sunglasses: ['Fashion Shades', 'Aura'], Beauty: ['Glow Lab', 'Velvet & Co'], Fragrances: ['Maison Noir', 'Aura'] }
const NAMES = ['Aarav Mehta', 'Diya Nair', 'Kabir Shah', 'Meera Iyer', 'Rohan Das', 'Sana Khan', 'Ishaan Roy', 'Anaya Pillai']

const money = (usd) => Math.max(49, Math.round((usd * USD_TO_INR) / 10) * 10 - 1)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const sample = (list, n) => [...list].sort(() => Math.random() - 0.5).slice(0, n)

async function fetchCategory(slug) {
  const res = await fetch(`https://dummyjson.com/products/category/${slug}?limit=${PER_CATEGORY}`)
  if (!res.ok) throw new Error(`dummyjson ${slug}: ${res.status}`)
  return (await res.json()).products
}

async function main() {
  await mongoose.connect(mongoUri)
  console.log(`Database: ${mongoose.connection.name}`)
  const existing = await Product.countDocuments()
  if (existing && !process.argv.includes('--reset')) {
    console.log(`The database already has ${existing} products. Run with --reset to wipe and reseed.`)
    return
  }
  await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})])

  const hash = (password) => bcrypt.hash(password, 10)
  const admin = await User.create({ ...ADMIN, password: await hash(ADMIN.password), isAdmin: true })
  const shopper = await User.create({ ...SHOPPER, password: await hash(SHOPPER.password) })
  const crowd = await User.insertMany(await Promise.all(NAMES.map(async (name) => ({
    username: name, email: `${name.split(' ')[0].toLowerCase()}@shopora.test`, password: await hash('Customer@2026!'),
  }))))
  const customers = [shopper, ...crowd]

  const products = []
  for (const [slug, label] of CATEGORIES) {
    const category = await Category.create({ name: label })
    for (const item of await fetchCategory(slug)) {
      const price = money(item.price)
      const mrp = item.discountPercentage > 4 ? Math.round(price / (1 - item.discountPercentage / 100) / 10) * 10 : 0
      const images = [...new Set([item.thumbnail, ...(item.images || [])])].filter(Boolean).slice(0, 4)
      const reviews = sample(customers, Math.min(3, item.reviews?.length || 0)).map((user, i) => ({
        name: user.username, user: user._id, rating: item.reviews[i].rating, comment: item.reviews[i].comment, verified: Math.random() > 0.4,
      }))
      products.push({
        name: item.title, image: images[0], images, brand: item.brand || pick(HOUSE[label] || [label]), category: category._id,
        description: item.description, price, mrp: mrp > price ? mrp : 0, countInStock: Math.min(item.stock, 60),
        reviews, numReviews: reviews.length,
        rating: reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0,
        sold: Math.floor(Math.random() * 40),
      })
    }
    console.log(`  ${label}`)
  }
  const created = await Product.insertMany(products)

  // a couple of weeks of sample orders so the admin dashboard has something to show
  const orders = []
  for (let i = 0; i < 40; i += 1) {
    const buyer = i < 5 ? shopper : pick(customers)
    const lines = sample(created, 1 + Math.floor(Math.random() * 3)).map((p) => ({ name: p.name, qty: 1 + Math.floor(Math.random() * 2), image: p.image, price: p.price, product: p._id }))
    const when = new Date(Date.now() - Math.random() * 13 * 24 * 3600 * 1000)
    const roll = Math.random()
    const status = roll < 0.12 ? 'cancelled' : roll < 0.45 ? 'delivered' : roll < 0.7 ? 'shipped' : 'processing'
    const method = Math.random() > 0.4 ? 'stripe' : 'cod'
    const paid = status !== 'cancelled' && (method === 'stripe' || status === 'delivered')
    orders.push({
      user: buyer._id, orderItems: lines, paymentMethod: method, ...priceOrder(lines), status, createdAt: when, updatedAt: when,
      shippingAddress: { fullName: buyer.username, phone: '9876543210', address: '12 Lake View Road', city: pick(['Kochi', 'Bengaluru', 'Chennai', 'Mumbai']), state: 'India', postalCode: '682001', country: 'India' },
      isPaid: paid, paidAt: paid ? when : undefined,
      isDelivered: status === 'delivered', deliveredAt: status === 'delivered' ? when : undefined,
      shippedAt: status === 'shipped' || status === 'delivered' ? when : undefined, cancelledAt: status === 'cancelled' ? when : undefined,
    })
  }
  await Order.collection.insertMany(orders.map((o) => ({ ...o, _id: new mongoose.Types.ObjectId(), __v: 0 })))

  console.log(`\nSeeded ${created.length} products in ${CATEGORIES.length} categories, ${customers.length + 1} users, ${orders.length} orders.`)
  console.log(`Admin:    ${ADMIN.email} / ${ADMIN.password}`)
  console.log(`Shopper:  ${SHOPPER.email} / ${SHOPPER.password}`)
  console.log('Change or delete these accounts before putting the shop online.')
  void admin
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => mongoose.disconnect())
