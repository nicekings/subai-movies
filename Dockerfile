FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && mkdir data && chown node:node data
COPY *.ts ./
USER node
ENV HOST=0.0.0.0
CMD ["node","public.ts"]