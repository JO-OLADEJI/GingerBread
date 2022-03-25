require('dotenv').config();
const express = require('express');
const axios = require('axios');
const PORT = process.env.PORT || 4001;
const app = express();

const telegramApiEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const botEndpoint = `${process.env.SERVER_URL}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;


// -> functions
const init = async () => {
  try {
    const res = await axios.get(`${telegramApiEndpoint}/setWebhook`, { 'params': { 'url': botEndpoint } });
    console.log(res.data);
  }
  catch (err) {
    console.log(new Error(err.message));
  }
}

const executeCommand = (command) => {
  try {
    let message;
    if (command === '/start') {
      message = 'Hey, thanks for checking me out. <b>I\'m Raven</b> 🦜, a bot for logging your flash-swaps arbitrage trades. /login with the 6 digit code used to initialize your arbitrage bot.';
    }
    else if (command === '/login') {
      // handle logic
      message = 'Input 6 digit bot initialization code 🔑.';
    }
    else if (command === '/logout') {
      // handle logic
      message = 'You are now logged out 📤.'
    }
    else if (command === '/help') {
      message = 'I can help you log📜 your flash-swap arbitrage trades here. If you don\'t have a bot running, check <a href="https://github.com/Joshua-Oladeji/flashloan-arbitrage-bot/blob/master/README.md">here to get started</a>. \n\nYou can control me by sending these <b>commands:</b> \n/login - connect your bot with 6 digit initialization code \n/logout - stop receiving info on your trades \n\n🦜';
    }
    else {
      message = 'Unrecognized command 🙄. Say what?';
    }
    return message;
  }
  catch (err) {
    console.log(new Error(err.message));
  }
}


// -> middlewares
app.use(express.json());


// -> routes
app.get('/', (req, res) => {
  res.json({ 'Raven': 'a telegram bot for logging arbitrage trades' });
});

app.post('/webhook/' + process.env.TELEGRAM_BOT_TOKEN, async (req, res) => {
  const update = req.body;
  const inputText = update['message']['text'];
  let outputText = executeCommand(inputText);
  
  try {
    const result = await axios.post(`${telegramApiEndpoint}/sendMessage`, {
      'chat_id': update['message']['chat']['id'],
      'text': outputText,
      'parse_mode': 'HTML'
    });
    return res.status(200).json({});
  }
  catch (err) {
    console.log(new Error(err.message));
    return res.status(500).send(err.message);
  }
});


// -> start
app.listen(PORT, async () => {
  console.log('server exposed to http://localhost:' + PORT);
  await init();
});