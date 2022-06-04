FROM node:17-alpine

RUN mkdir app
WORKDIR app

ENV DATABASE_URL="postgresql://root:root@localhost:5432/mydrive"
ENV AWS_API_KEY=""
ENV AWS_SECRET_KEY=""
ENV AWS_REGION="us-east-1"
ENV AWS_BUCKET_NAME="mydrives3bucket"

ENV PORT=3000
EXPOSE 3000

COPY package.json package.json
RUN npm install --only=prod --no-audit

COPY dist .

CMD ["node", "."]