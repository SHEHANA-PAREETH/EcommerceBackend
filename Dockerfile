FROM node:16-alpine
ENV JWT_SECRETKEY="asdfghjkkl"
ENV NODE_ENV="development"
ENV STRIPE_SECRET_KEY="sk_test_51P65lNSC8qQELg2Ownxm0mEaT4LAg084I0t0WH83D5qozUA7tA7uHbV1rTc17nldZ4XEKrt6awhlfyvP1FZodmst00pVLqRztV"
ENV CLIENT_SITE_URL="http://13.48.123.137:3000"
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g nodemon
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
