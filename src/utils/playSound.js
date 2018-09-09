async function playSound (voiceChannel, fileName, volume = 0.20) {
  try {
    const connection = await voiceChannel.join()

    const dispatcher = connection.play(fileName, { volume })

    return new Promise((resolve, reject) => {
      dispatcher.on('start', resolve)
    })
  } catch (e) {
    console.error(e)
  }
}

module.exports = playSound
