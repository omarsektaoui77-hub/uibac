FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm --version && npm install

COPY . .

EXPOSE 3000

CMD ["node", "apps/api/server.js"]
