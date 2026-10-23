const { isProd } = require('../config/env')

const notFound = (req, res) => res.status(404).json({ error: 'Not found' })

// every failure leaves the API in the same shape: { error: "message" }
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500
  let message = err.message
  if (err.code === 11000) { status = 409; message = 'That value is already in use' }
  else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join(', ') }
  else if (err.name === 'CastError') { status = 400; message = 'Invalid value' }
  else if (err.code === 'LIMIT_FILE_SIZE') { status = 400; message = 'Each image must be 4 MB or smaller' }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON' }
  if (status >= 500) {
    console.error(err)
    if (isProd) message = 'Something went wrong on our side'
  }
  res.status(status).json({ error: message })
}

module.exports = { notFound, errorHandler }
