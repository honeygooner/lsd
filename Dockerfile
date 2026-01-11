FROM node:24
WORKDIR /app
ENV NODE_ENV=production

# dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# sourcecode
COPY src ./src

CMD ["npm", "start"]
