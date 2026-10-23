const { freeShippingFrom, shippingFee, taxRate } = require('../config/env')
const { round2 } = require('./helpers')

// the only place where an order total is worked out. Prices always come from the database, never from the browser.
function priceOrder(lines) {
  const itemsPrice = round2(lines.reduce((sum, line) => sum + line.price * line.qty, 0))
  const shippingPrice = itemsPrice === 0 || itemsPrice >= freeShippingFrom ? 0 : shippingFee
  const taxPrice = round2(itemsPrice * taxRate)
  const totalPrice = round2(itemsPrice + shippingPrice + taxPrice)
  return { itemsPrice, shippingPrice, taxPrice, totalPrice }
}

module.exports = { priceOrder }
