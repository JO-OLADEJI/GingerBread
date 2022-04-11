require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const GingerBread = require('./gingerbread.js');
const axios = require('axios');
const PORT = process.env.PORT || 4001;
const telegramApiEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const telegramBotEndpoint = `${process.env.SERVER_URL}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
const telegramBotCommands = ['/balance', '/subscribe', '/unsubscribe'];
const guests = []; // - chatIds of to be notified when there's a successful trade
const app = express();
app.use(express.json());



/**
 * tokens to be used to perform arbitrage - as pair
 */
const token0 = { symbol: 'WAVAX', address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', volume: 1000 };
const token1 = { symbol: 'JOE', address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd', volume: 100000 };

/**
 * @instance of GingerBread class
 */
const wavaxJoe = new GingerBread(token0, token1);
wavaxJoe.bake(); // start checking for arbitrage opportunities on every new block
wavaxJoe.serve(); // activate function for logging contract events to telegram




/**
 * @async Function to initialize webhook for telegram bot - listen for incomming updates(messages)
 */
const initTelgramBot = async () => {
  try {
    const res = await axios.get(`${telegramApiEndpoint}/setWebhook`, { 'params': { 'url': telegramBotEndpoint } });
    console.log(res.data);
  }
  catch (err) {
    console.log(new Error(err.message));
  }
}


/**
 * @async Function to send message to telegram
 * @param {Number} chatId telegram chat_id of the message receiver
 * @param {String} message - text to be sent to telegram chat id
 * @returns {Promise}
 */
const logToTelegram = async (chatId, message) => {
  await axios.post(
    `${telegramApiEndpoint}/sendMessage`, 
    { 
      'chat_id': chatId,
      'text': message,
      'parse_mode': 'HTML'
    });
}



/**
 * @listens Trade handles the event that's emmited when an arbitrage trade occurs
 */
wavaxJoe.on('trade', async (props) => {
  try {
    const message = `You've been served a GingerBread🍪 worth <b>${ethers.utils.formatEther(props['profit']).toString()} ${token0 === props['token'] ? token0['symbol'] : token1['symbol']}</b> tokens.`;
    guests.forEach(async (chatId) => await logToTelegram(chatId, message));
  }
  catch (err) {
    console.log(new Error(err.message));
  }
});


/**
 * @listens tx-hash handles the event that's emmited when the trade generates a transaction hash
 */
wavaxJoe.on('tx-hash', async (props) => {
  try {
    const message = `View <a href="https://snowtrace.io/tx/${props['hash']}">Tx hash</a>.`;
    guests.forEach(async (chatId) => await logToTelegram(chatId, message));
  }
  catch (err) {
    console.log(new Error(err.message));
  }
});


/**
 * @listens GasAdded handles the event that's emmited when contract receives AVAX for gas
 */
wavaxJoe.on('gas-added', async (props) => {
  try {
    const message = `Hey, <b>${ethers.utils.formatEther(props['amount'])} AVAX</b> was added to your contract by <a href="https://snowtrace.io/address/${props['by']}">${props['by']}</a> to top-up gas fees.`;
    guests.forEach(async (chatId) => await logToTelegram(chatId, message));
  }
  catch (err) {
    console.log(new Error(err.message));
  }
});


/**
 * @listens Withdraw handles the event that's emmited when contract owner withdraws AVAX from contract
 */
wavaxJoe.on('withdrawal', async (props) => {
  try {
    const message = `Hey, <b>${ethers.utils.formatEther(props['amount'])} AVAX</b> was withdrawn from your contract by <a href="https://snowtrace.io/address/${props['by']}">${props['by']}</a>.`;
    guests.forEach(async (chatId) => await logToTelegram(chatId, message));
  }
  catch (err) {
    console.log(new Error(err.message));
  }
});





/**
 * @callback fn handles the get requests to the homepage
 */
app.get('/', (req, res) => {
  res.status(200).json({ 'Gingerbread': 'a bot for arbitraging trades using flashswaps' });
});


/**
 * @callback fn handles post request to the bot endpoint - responsible for responding to updates
 */
app.post('/webhook/' + process.env.TELEGRAM_BOT_TOKEN, async (req, res) => {
  const update = req.body;
  const chatId = update['message']['chat']['id'];
  const message = update['message']['text'].toLowerCase();
  console.log({ message });
  
  try {
    let reply;
    if (!telegramBotCommands.includes(message)) {
      reply = 'Hi, I serve Gingerbreads🍪 privately.';
      await logToTelegram(chatId, reply);
    }
    else if (message === telegramBotCommands[0]) {
      const contractBalance = await wavaxJoe.flourRemaining();
      reply = `Your contract's balance is <b>${ethers.utils.formatEther(contractBalance)} AVAX</b>.`;
      await logToTelegram(chatId, reply);
    }
    else if (message === telegramBotCommands[1]) {
      !guests.includes(chatId) ? guests.push(chatId) : null;
      reply = `You'll be notified when an arbitrage is successful ✔.`;
      await logToTelegram(chatId, reply);
    }
    else if (message === telegramBotCommands[2]) {
      const guestIndex = guests.findIndex((guest) => guest === chatId);
      guestIndex && guests.splice(guestIndex, 1);
      reply = `You've successfully unsubscribed from trade notifications ✔.`;
      await logToTelegram(chatId, reply);
    }
    return res.status(200).json({ reply });
  }
  catch (err) {
    return res.status(500).send(err.message);
  }
});


/**
 * Setup server to listen for requests on the given port
 */
const server = app.listen(PORT, async () => {
  console.log('server running on http://localhost:' + PORT);
  await initTelgramBot();
});


/**
 * @exports server for integration testing
 */
module.exports = server;