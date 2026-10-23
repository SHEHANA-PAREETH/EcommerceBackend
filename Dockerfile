FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 5000
# secrets (MONGO_URI, JWT_SECRETKEY, STRIPE_SECRET_KEY, CLIENT_SITE_URL ...) are passed at run time, never baked into the image
CMD ["node", "index.js"]
