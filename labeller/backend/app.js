const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const aws = require('aws-sdk')

const app = express()
const router = express.Router()

router.use(bodyParser.json())
router.use(awsServerlessExpressMiddleware.eventContext())

router.get('/', (req, res) => {
    res.json(req.apiGateway.event)
})

app.use('/', router)

module.exports = app
