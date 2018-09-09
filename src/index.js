const DiscordCommandsHandler = require('./commandsHandler')
const commands = require('./commands')

function createBot (token, options = {}) {
  const handler = new DiscordCommandsHandler(token, options)

  handler.on(['play', '!'], commands.play)

  return handler
}

module.exports = createBot
