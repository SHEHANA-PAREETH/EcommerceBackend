# Shopora API

Express + MongoDB backend for the Shopora online store: accounts, catalogue, orders, Stripe card payments and an admin API.

## Run locally

```bash
npm install
cp .env.example .env      # fill in MONGO_URI and JWT_SECRETKEY
npm run seed              # demo catalogue, admin and customers (use --reset to start over)
npm run dev               # http://localhost:5000
```

The seed creates `admin@shopora.test` and `shopper@shopora.test` (passwords are printed by the script, or set `SEED_ADMIN_PASSWORD` / `SEED_SHOPPER_PASSWORD`). Change or delete them before going live.

## Environment

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (with database name) |
| `JWT_SECRETKEY` | signs the session cookie, 32+ characters in production |
| `CLIENT_SITE_URL` | allowed website origin(s), comma separated |
| `STRIPE_SECRET_KEY` | optional, enables card payments |
| `CLOUDINARY_URL` | optional, stores product pictures on Cloudinary |

## How it is protected

- Passwords hashed with bcrypt; the session is an httpOnly cookie that is re-checked against the database on every request.
- Order prices, shipping and GST are always calculated on the server from database prices; stock is taken atomically so it can't be oversold.
- Card payments are confirmed with Stripe itself before an order is marked paid.
- Input is validated and coerced to plain strings (no NoSQL operator injection), search text is regex-escaped, uploads are limited to small images.
- Rate limiting on sign in and sign up, helmet headers, CORS limited to your website, and a custom header required for changing requests in production (CSRF).

## Main endpoints

`/api/users`, `/api/category`, `/api/product` (search, filters, facets, reviews), `/api/orders` (create, mine, cancel, Stripe checkout and verify, admin status), `/api/admin` (stats, customers).
