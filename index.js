const config = require('./config')
const createBot = require('./src')

config.onReady = () => console.log('ready')

const Bot = createBot(config.token, config)

Bot.listen().then(() => console.log('connected'))
