const discord = require('discord.js')
const client = new discord.Client()
const fs = require('fs')
const path = require('path')
const request = require('request')
const ytdl = require('ytdl-core')

const config = require('./config.json')
const PREFIX = config.prefix
const DELETE_DELAY = config.delete_delay || 1000
const ALIASES = config.aliases
const SOUNDS_DIR = config.soundDir || './sounds/'

let GREETING_SONG = config.greeting_song || 'allahu'
let ENABLED_GREETING = config.enabled_greeting || false
let TTS_ON = config.is_tts_avaliable || false
let VOLUME = config.defaultVolume || 20
VOLUME = { volume: VOLUME / 100 }


/////
// Utils
/////

const getCommand = text => text.split(' ')[0].slice(PREFIX.length)

const getArgs = text => text.split(' ').slice(1)

const getTime = () => `${new Date()}`

const printLog = (command, args, user) => console.log(`${getTime()}\t${user}\t${command}\t${args.join(', ')}`)

const checkPermissions = (command, message) => {
  if (message.channel.type === 'dm' && ['list', 'delete', 'help'].includes(command))
    return false
  return true
}

const getUsername = (message) => {
  if (message.channel.type === 'dm')
    return message.author.username
  else
    return message.member.user.username
}

const getSounds = () => {
  return fs.readdirSync(SOUNDS_DIR)
    .filter(sound => path.extname(sound) === '.mp3')
    .map(sound => path.basename(sound, path.extname(sound)))
}

const parseText = (text) => {
  const data = {
    command: getCommand(text),
    args: getArgs(text)
  }
  ALIASES.forEach(item => {
    if (text.startsWith(item.prefix)) {
      data.command = item.command
    }
  })
  return data
}

/////
// Main
/////

const commandDispatcher = (command, args, message) => {
  if (command in commandsDispatcher) {
    commandsDispatcher[command](args, message)
    args.unshift('executed')
  }

  printLog(command, args, getUsername(message))
}

const playSound = async (voiceChannel, sound) => {
  try {
    const connection = await voiceChannel.join()

    // Stop previus song if playing song exists and doesn't paused
    if (connection.player.dispatcher && !connection.player.dispatcher.paused) {
      connection.player.dispatcher.pause()
    }

    const fileName = `${SOUNDS_DIR}${sound}.mp3`
    const dispatcher = connection.playFile(fileName, VOLUME)

    // Workaround with gorwing delays
    dispatcher.on('start', () => connection.player.streamingData.pausedTime = 0)
  } catch (e) {
    console.error(e)
  }
}

const play = async ([ sound ], message) => {
  if (!sound) return

  // Check if sender in voice channel
  const { voiceChannel } = message.member
  if (!voiceChannel) return

  // Check if sound exists on fs
  if (!fs.readdirSync(SOUNDS_DIR).includes(`${sound}.mp3`)) return
  playSound(voiceChannel, sound)
}


const yt = async ([ url ], message) => {
  if (!url) return

  const { voiceChannel } = message.member
  if (!voiceChannel) return

  try {
    const connection = await voiceChannel.join()
    if (connection.player.dispatcher && !connection.player.dispatcher.paused) {
      connection.player.dispatcher.pause()
    }

    const stream = ytdl(url, {filter: 'audioonly'})
    const dispatcher = connection.playStream(stream, VOLUME)

  } catch (e) {
    return console.error(e)
  }
}

const TTS = (args, message) => {
  if (TTS_ON === true) {
    message.channel.send(args.join(' '), { tts: true })
  }
}
const TTSOn = args => TTS_ON = true
const TTSOff = args => TTS_ON = false
const greetingOn = args => ENABLED_GREETING = true
const greetingOff = args => ENABLED_GREETING = false

const greeting = ([ sound ], message) => {
  if (!sound) return message.channel.send('Не указано имя файла')

  if (!fs.readdirSync(SOUNDS_DIR).includes(`${sound}.mp3`)) {
    return message.channel.send('Нет такого файла')
  }

  GREETING_SONG = sound

  message.channel.send(`\`${sound}\` - это дерьмо поставлено на приветствие этим уважаемым человеком \`${message.author.username}\``)
}

const list = (args, message) => {
  const sounds = getSounds().join("\n")
  const text = "```Sound List. To play sound, type !play [sound name] or !! [sound name] \n\n" + sounds + "```"
  message.author.send(text)
}

const pause = async (args, message) => {
  const { voiceChannel } = message.member
  if (!voiceChannel) return

  try {
    const connection = await voiceChannel.join()
    if (connection && connection.dispatcher) {
      connection.dispatcher.pause()
    }
  } catch (e) {
    console.error(e)
  }
}

const stop = async (args, message) => {
  const { voiceChannel } = message.member
  if (!voiceChannel) return

  try {
    const connection = await voiceChannel.join()
    if (connection && connection.dispatcher) {
      connection.dispatcher.end()
    }
  } catch (e) {
    console.error(e)
  }
}

const resume = async (args, message) => {
  const { voiceChannel } = message.member
  if (!voiceChannel) return

  try {
    const connection = await voiceChannel.join()
    if (connection && connection.dispatcher) {
      connection.dispatcher.resume()
    }

  } catch (e) {
    console.error(e)
  }
}

const volume = ([ value ]) => {
  if (!value || value == 0) return
  VOLUME.volume = parseInt(value) / 100
}

const help = (args, message) => {
  const text = `
    \`\`\`
    Avaliable commands:\n\n

    !help                    Show this message\n
    !play [sound_name]       Play [sound_name]\n
    !random                  Play random song\n
    !list                    List avaliable sounds\n
    !stop                    Stop playing current song\n
    !pause                   Pause playing current song\n
    !resume                  Resume playing previus song\n
    !addFile                 Add files (Only accepts .mp3)\n
    !yt [link]               Play an YouTube video from [link]\n
    !volume [1..100]         Set volume form 1 to 100 (Default 20)\n
    !TTS [text]              Talks passed text (Switched OFF by default)\n
    !TTSOn                   Switch TTS on\n
    !TTSOff                  Switch TTS off\n
    !greetingOn              Switch on greeting on connection (Switched ON by default)\n
    !greetingOff             Switch off greeting on connection\n
    !greeting [sound_name]   Set [sound_name] as greeting on someone connect\n
    \n
    Aliases:\n\n
    !! [song_name]           Play [sound_name]. Space is required.\n
    \n\n
    To add song to songlist, follow this steps:\n
    \t1. Drag'n'Drop songs in the channel with bot.\n
    \t2. In the comment message write !addFile [soundname] command (if soundname is not specified, name of the file will be used instead).\n
    \t3. You will see success message, if everything is OK\n
    \`\`\`
  `
  message.author.send(text)
}

const random = (args, message) => {
  const { voiceChannel } = message.member
  if (!voiceChannel) return
  const sounds = getSounds()
  const randomIndex = Math.floor(Math.random() * (sounds.length - 1))
  playSound(voiceChannel, sounds[randomIndex])
}

const addFile = ([ soundName ], message) => {
  message.attachments.every(({ filename, url }) => {
    if (path.extname(filename) !== '.mp3') {
      console.log(`Attempting to add file with no valid extinshion: ${filename}`)
      return message.author.send(`${filename} have not valid extension!`)
    }

    const extName = path.extname(filename)
    const actualFileName = soundName ? `${soundName}${extName}` : filename

    if (getSounds().includes(path.basename(actualFileName, extName))) {
      console.log(`Attempting to add file with existing name: ${actualFileName}`)
      return message.author.send(`${actualFileName} already exists!`)
    }

    const dest = `${SOUNDS_DIR}${actualFileName}`
    const file = fs.createWriteStream(dest)

    request.head(url, (err, res, body) => {
       request(url).pipe(file).on('close', () => {
        console.log(`${actualFileName} successfully added`)
        message.author.send(`${actualFileName} successfully downladed! You may now use it with \`!play\` or \`!!\``)
       })
    })
  })
}


const commandsDispatcher = {
  play,
  pause,
  stop,
  resume,
  random,
  volume,
  addFile,
  yt,
  TTS,
  TTSOn,
  TTSOff,
  greetingOn,
  greetingOff,
  greeting,
  help,
  list
}

/////
// Events
/////

client.on('ready', () => console.log('Ready'))


client.on('voiceStateUpdate', (oldMember, newMember) => {
  if (!ENABLED_GREETING) return printLog('logged', ['not played'], newMember.user.username)
  if (newMember.user.bot) return
  if (newMember.voiceChannelID === oldMember.voiceChannelID) return

  const { voiceChannel } = newMember
  if (!voiceChannel) return

  playSound(voiceChannel, GREETING_SONG)
  printLog('logged', ['played'], newMember.user.username)
})


client.on('message', message => {
  // Prevent self-spaming (just in case)
  if (message.author.bot) return

  // Ignore messages that doesn't related to bot
  if (!message.content.startsWith(PREFIX)) return

  // Get command and args
  let { command, args } = parseText(message.content)

  commandDispatcher(command, args, message)

  if (checkPermissions('delete', message)) {
    message.delete(DELETE_DELAY).then(msg => {
      console.log('Message Deleted')
    })
  }
})

client.login(config.token)
