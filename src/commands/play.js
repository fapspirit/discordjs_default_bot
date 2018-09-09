const path = require('path')
const fs = require('fs').promises
const playSound = require('../utils/playSound')
const SOUNDS_DIR = '../../sounds'

async function play ([ sound ], message, { options }) {
  if (!sound) return

  // Check if sender in voice channel
  const { voice } = message.member
  if (!voice || !voice.channel) return

  const pathToSound = path.resolve(__dirname, `${SOUNDS_DIR}/${sound}.mp3`)

  // Check if sound exists on fs
  try {
    const fileAccess = await fs.access(pathToSound)
    if (fileAccess !== undefined) return
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('No such song', sound)
    }
    return
  }

  return playSound(voice.channel, pathToSound, options.volume)
}

module.exports = play
