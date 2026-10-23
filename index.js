const express = require('express')
const path = require('path')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const { port, clientUrls, isProd } = require('./config/env')
const connectDB = require('./config/db')
const routes = require('./routes')
const { notFound, errorHandler } = require('./middleware/error')
const { apiLimiter, requireAjaxHeader } = require('./middleware/security')

const app = express()
app.set('trust proxy', 1) // behind Render / nginx, so rate limits see the real client IP

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })) // product pictures are shown on another origin
app.use(compression())
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || clientUrls.includes(origin) || (!isProd && /^http:\/\/localhost:\d+$/.test(origin))),
  credentials: true,
}))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), { maxAge: '7d', index: false }))

app.get('/health', (req, res) => res.json({ ok: true }))
app.use('/api', apiLimiter, requireAjaxHeader, routes)
app.use(notFound)
app.use(errorHandler)

connectDB().then(() => {
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
})
