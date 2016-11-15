const discord = require('discord.js')
const client = new discord.Client()
const fs = require('fs')
const path = require('path')

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

let getCommand = text => text.split(' ')[0].slice(PREFIX.length)

let getArgs = text => text.split(' ').slice(1)

let getTime = () => `${new Date()}`

let printLog = (command, args, user) => console.log(`${getTime()}\t${user}\t${command}\t${args.join(', ')}`)

let checkPermissions = (command, message) => {
  if (message.channel.type === 'dm' && ['list', 'delete', 'help'].includes(command))
    return false
  return true
}

let getUsername = (message) => {
  if (message.channel.type === 'dm') {
    return message.author.username
  } else {
    return message.member.user.username
  }
}

let getSounds = () => {
  return fs.readdirSync(SOUNDS_DIR)
    .filter(sound => path.extname(sound) === '.mp3')
    .map(sound => path.basename(sound, path.extname(sound)))
}

/////
// Main
/////

let commandDispatcher = (command, args, message) => {
  if (command in commandsDispatcher) {
    commandsDispatcher[command](args, message)
    args.unshift('executed')
  }

  printLog(command, args, getUsername(message))
}

let playSound = (voiceChannel, sound) => {
  voiceChannel.join().then(connection => {
    // Stop previus song if playing song exists and doesn't paused
    if (connection.player.dispatcher && !connection.player.dispatcher.paused) {
      connection.player.dispatcher.pause()
    }

    let fileName = `${SOUNDS_DIR}${sound}.mp3`
    let dispatcher = connection.playFile(fileName, VOLUME)
    // Pause song after playing
    dispatcher.on('end', () => dispatcher.pause())
  }).catch(console.error)
}

let play = (args, message) => {
  let sound = args[0]
  if (!sound) return

  // Check if sender in voice channel
  let voiceChannel = message.member.voiceChannel
  if (!voiceChannel) return

  // Check if sound exists on fs
  if (!fs.readdirSync(SOUNDS_DIR).includes(`${sound}.mp3`)) return
  playSound(voiceChannel, sound)
}

let TTS = (args, message) => {
  if (TTS_ON === true) {
    message.channel.sendTTSMessage(args.join(' '))
  }
}
let TTSOn = args => TTS_ON = true
let TTSOff = args => TTS_ON = false
let greetingOn = args => ENABLED_GREETING = true
let greetingOff = args => ENABLED_GREETING = false

let greeting = (args, message) => {
  let sound = args[0]
  if (!sound) return message.channel.sendMessage('Не указано имя файла')

  if (!fs.readdirSync(SOUNDS_DIR).includes(`${sound}.mp3`)) {
    return message.channel.sendMessage('Нет такого файла')
  }

  GREETING_SONG = sound

  message.channel.sendMessage(`\`${sound}\` - это дерьмо поставлено на приветствие этим уважаемым человеком \`${message.author.username}\``)
}

let list = (args, message) => {
  let sounds = getSounds().join("\n")
  let text = "```Sound List. To play sound, type !play [sound name] \n\n" + sounds + "```"
  message.author.sendMessage(text)
}

let stop = (args, message) => {
  let voiceChannel = message.member.voiceChannel
  if (!voiceChannel) return

  voiceChannel.join().then(connection => connection.player.dispatcher.pause())
}

let resume = (args, message) => {
  let voiceChannel = message.member.voiceChannel
  if (!voiceChannel) return

  voiceChannel.join().then(connection => connection.player.dispatcher.resume())
}

let volume = args => {
  if (!args[0] || args[0] == 0) return
  VOLUME.volume = parseInt(args[0]) / 100
}

let help = (args, message) => {
  let text = `
    \`\`\`
    Avaliable commands:\n\n

    !help                    Show this message\n
    !play [sound_name]       Play [sound_name]\n
    !random                  Play random song\n
    !list                    List avaliable sounds\n
    !stop                    Pause playing current song\n
    !resume                  Resume playing previus song\n
    !volume [1..100]         Set volume form 1 to 100 (Default 20)\n
    !TTS [text]              Talks passed text (Switched OFF by default)\n
    !TTSOn                   Switch TTS on\n
    !TTSOff                  Switch TTS off\n
    !greetingOn              Switch on greeting on connection (Switched ON by default)\n
    !greetingOff             Switch off greeting on connection\n
    !greeting [sound_name]   Set [sound_name] as greeting on someone connect\n
    \`\`\`
  `
  message.author.sendMessage(text)
}

let random = (args, message) => {
  let voiceChannel = message.member.voiceChannel
  if (!voiceChannel) return
  let sounds = getSounds()
  let randomIndex = Math.floor(Math.random() * (sounds.length - 1))
  playSound(voiceChannel, sounds[randomIndex])
}

const commandsDispatcher = {
  play,
  stop,
  resume,
  random,
  volume,
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

  let voiceChannel = newMember.voiceChannel
  if (!voiceChannel) return

  playSound(voiceChannel, GREETING_SONG)
  printLog('logged', ['played'], newMember.user.username)
})

client.on('message', message => {
  // Prevent self-spaming (just in case)
  if (message.author.bot) return

  // Ignore messages that doesn't related to bot
  if (!message.content.startsWith(PREFIX)) return

  // Get command
  const command = getCommand(message.content)

  // Get args
  let args = getArgs(message.content)

  commandDispatcher(command, args, message)

  if (checkPermissions('delete', message)) {
    message.delete(DELETE_DELAY).then(msg => {
      console.log('Message Deleted')
    })
  }
})

client.login(config.token)
