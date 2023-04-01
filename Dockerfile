FROM node:14

EXPOSE 10086

WORKDIR /app
ADD ./dist /app/dist
ADD ./view /app/view
ADD ./docs /app/docs
ADD ./package.json /app/package.json
# ADD ./node_modules /app/node_modules

RUN npm config set registry https://registry.npmmirror.com
RUN npm i

RUN pwd
RUN ls

CMD ["npm", "start"]
