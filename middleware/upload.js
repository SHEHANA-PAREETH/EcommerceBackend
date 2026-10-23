const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const multer = require('multer')
const { cloudinary: useCloud } = require('../config/env')
const { HttpError } = require('../utils/helpers')

const uploadDir = path.join(__dirname, '..', 'public', 'uploads')
const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

// with Cloudinary configured pictures go there (survives redeploys); otherwise they are saved on disk
const storage = useCloud
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => { fs.mkdirSync(uploadDir, { recursive: true }); cb(null, uploadDir) },
      filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${TYPES[file.mimetype]}`),
    })

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => (TYPES[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Only JPG, PNG or WebP images are allowed'))),
})

let cloud
const toCloud = (file) => {
  cloud ||= require('cloudinary').v2
  return new Promise((resolve, reject) => {
    cloud.uploader.upload_stream({ folder: 'shop-products', resource_type: 'image' }, (error, result) => (error ? reject(error) : resolve(result.secure_url))).end(file.buffer)
  })
}

// turns the uploaded files into the strings stored on the product
const savedPaths = async (files = []) => Promise.all(files.map((file) => (useCloud ? toCloud(file) : `/uploads/${file.filename}`)))

module.exports = { uploadImages: upload.array('images', 5), savedPaths }
