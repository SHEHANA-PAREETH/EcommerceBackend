require('dotenv').config()

const isProd = process.env.NODE_ENV === 'production'

for (const name of ['MONGO_URI', 'JWT_SECRETKEY']) {
  if (!process.env[name]) {
    console.error(`Missing ${name} in the environment (.env)`)
    process.exit(1)
  }
}
if (isProd && process.env.JWT_SECRETKEY.length < 32) {
  console.error('JWT_SECRETKEY must be at least 32 characters in production')
  process.exit(1)
}

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRETKEY,
  // comma separated list of allowed browser origins
  clientUrls: (process.env.CLIENT_SITE_URL || 'http://localhost:3010').split(',').map((url) => url.trim().replace(/\/$/, '')).filter(Boolean),
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
  cloudinary: Boolean(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME),
  // shop rules (INR)
  currency: 'inr',
  freeShippingFrom: 999,
  shippingFee: 49,
  taxRate: 0.18,
  maxQtyPerItem: 10,
}
