FROM node:20-slim

WORKDIR /home/user/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=7860
EXPOSE 7860

CMD ["npm", "start"]
