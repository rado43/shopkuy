FROM node:20-alpine

WORKDIR /app

# Install dependencies dulu (cache layer)
COPY package*.json ./
RUN npm install --omit=dev

# Copy seluruh source
COPY . .

# Folder upload (juga akan di-mount sebagai volume di compose)
RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]
