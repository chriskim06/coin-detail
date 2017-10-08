'use strict';

const Alexa = require('alexa-sdk')
const https = require('https')

const APP_ID = process.env.SKILL_ID

const locale = {
  WELCOME_MESSAGE: 'Welcome to Coin Detail. You can ask a question like, what\'s the price of bitcoin? ... Now, what can I help you with?',
  WELCOME_REPROMPT: 'For instructions on what you can say, please say help me.',
  DISPLAY_CARD_TITLE: (coin) => `Coin Detail - Info for ${coin}.`,
  HELP_MESSAGE: 'You can ask questions such as, what\'s price of bitcoin, or, you can say exit ... Now, what can I help you with?',
  HELP_REPROMPT: 'You can say things like, what\'s the price, or you can say exit ... Now, what can I help you with?',
  STOP_MESSAGE: 'Ok, thanks for using the Coin Detail skill.',
  NOT_FOUND_MESSAGE: (coin) => `I'm sorry, I currently do not know about ${coin}. `,
  NOT_FOUND_REPROMPT: 'What else can I help with?'
}

const validCoins = {
  'bitcoin': 'bitcoin',
  'ethereum': 'ethereum',
  'litecoin': 'litecoin',
  'lite': 'litecoin',
  'light': 'litecoin',
  'ripple': 'ripple',
  'bitcoin cash': 'bitcoin-cash',
  'dash': 'dash',
  'monero': 'monero'
}

const handlers = {
  'LaunchRequest': function() {
    this.attributes.speechOutput = locale.WELCOME_MESSAGE
    this.attributes.repromptSpeech = locale.WELCOME_REPROMPT
    this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech)
  },
  'PriceIntent': function() {
    const coinSlot = this.event.request.intent.slots.Coin
    let coinName = (coinSlot) ? coinSlot.value : null
    build.call(this, coinName, 'price_usd', 'price')
  },
  'MarketIntent': function() {
    const coinSlot = this.event.request.intent.slots.Coin
    let coinName = (coinSlot) ? coinSlot.value : null
    build.call(this, coinName, 'market_cap_usd', 'market cap')
  },
  'ChangeIntent': function() {
    const coinSlot = this.event.request.intent.slots.Coin
    let coinName = (coinSlot) ? coinSlot.value : null
    build.call(this, coinName, 'percent_change_24h', 'twenty four hour percent change')
  },
  'VolumeIntent': function() {
    const coinSlot = this.event.request.intent.slots.Coin
    let coinName = (coinSlot) ? coinSlot.value : null
    build.call(this, coinName, '24h_volume_usd', 'current twenty four hour volume')
  },
  'AMAZON.HelpIntent': function() {
    this.attributes.speechOutput = locale.HELP_MESSAGE
    this.attributes.repromptSpeech = locale.HELP_REPROMPT
    this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech)
  },
  'AMAZON.RepeatIntent': function() {
    this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech)
  },
  'AMAZON.StopIntent': function() {
    this.emit('SessionEndedRequest')
  },
  'AMAZON.CancelIntent': function() {
    this.emit('SessionEndedRequest')
  },
  'SessionEndedRequest': function() {
    this.emit(':tell', locale.STOP_MESSAGE)
  },
  'Unhandled': function() {
    this.attributes.speechOutput = locale.HELP_MESSAGE
    this.attributes.repromptSpeech = locale.HELP_REPROMPT
    this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech)
  }
}

const build = function(coin, filter, text) {
  request(coin, filter, text, (value, error) => {
    if (!error) {
      this.attributes.speechOutput = value
      this.emit(':tellWithCard', value, locale.DISPLAY_CARD_TITLE(coin), value, value)
    } else {
      console.error(error)
      let name = coin || 'that'
      let speechOutput = locale.NOT_FOUND_MESSAGE(name) + locale.NOT_FOUND_REPROMPT
      this.attributes.speechOutput = speechOutput
      this.attributes.repromptSpeech = locale.NOT_FOUND_REPROMPT
      this.emit(':ask', speechOutput, locale.NOT_FOUND_REPROMPT)
    }
  })
}

const request = (coinName, filter, text, callback) => {
  if (!validCoins[coinName]) {
    return callback(null, `invalid coin: ${coinName}`)
  }
  https.get(`https://api.coinmarketcap.com/v1/ticker/${validCoins[coinName]}/`, (res) => {
    let data = ''
    res.setEncoding('utf8')
    res.on('data', (chunk) => {
      data += chunk
    })
    res.on('end', () => {
      try {
        let val
        let response = JSON.parse(data)[0]
        if (filter !== 'percent_change_24h') {
          val = `$${parseFloat(response[filter]).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
        } else {
          val = `${response[filter]}%`
        }
        callback(`The ${text} of ${coinName} is ${val}`, null)
      } catch (e) {
        callback(null, `BAD REQUEST: ${filter}`)
      }
    })
  }).on('error', (e) => {
    callback(null, e)
  })
}

exports.handler = function(event, context) {
  if (!event.ping) {
    const alexa = Alexa.handler(event, context)
    alexa.appId = APP_ID
    alexa.resources = locale
    alexa.registerHandlers(handlers)
    alexa.execute()
  }
}

