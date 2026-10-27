FROM node:20-alpine

# Cài đặt OpenSSL cho Prisma trên Alpine Linux
RUN apk add --no-cache openssl

WORKDIR /app

# Cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema và generate Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy toàn bộ mã nguồn
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
