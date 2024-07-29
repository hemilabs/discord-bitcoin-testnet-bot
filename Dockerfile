FROM node:22

WORKDIR /bot

COPY package.json pnpm-lock.yaml .
RUN npx pnpm@9 install
COPY . .

USER node

CMD [ "npm", "start"]
