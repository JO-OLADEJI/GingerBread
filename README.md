# GingerBread 🍪

A bot for executing arbitrage trades using flash swaps on the avalanche C-chain. Has the option to log succesful arbitrage trades on Telegram.
<br />
<br />

## How to Prepare 🥘
- clone this reposity:
```
git clone https://github.com/Joshua-Oladeji/GingerBread.git
```

- run `npm install` from the root directory to install dependencies

- fill the .env.example file with the appropriate data and rename the file to .env
  - `PRIVATE_KEY`: private key of the contract deployer address
  - `C_CHAIN_NODE`: a link that connects you to an avalanche C-chain node. you can get a 'speedy-node' from [moralis.io](https://moralis.io/)
  - `TELEGRAM_BOT_TOKEN`: an authorization token from Telegram's Bot father. it's pretty easy to [get one](https://core.telegram.org/bots#6-botfather)
  - `SERVER_URL`: base url of your server. it's for configuring a webhook for your telegram bot. if you're running on localhost, you will need to expose your server via a public url. check out [ngrok](https://ngrok.com/)
  - `FLASH_SWAP_ADDRESS`: contract address of the bot you'll deploy

- deploy the contract to your preferred network. available networks can be found in `hardhat.config.js`
```
npx hardhat run scripts/deploy.js --network <network-name>
```

- run the `server.js` file, relax and wait to be served.
<br />
<br />

## Methods ⚡
you might want to know the purpose of each method if you want to tweak some things in the recipe.
<br />

### constructor(token0, token1) 🔥
- a new GingerBread is initialized with 2 parametes which represents the tokens that constitute a pair.
- each parameter is an object containing the 'symbol', 'address' and 'volume' keys.... like so:
```javascript
{ 
  symbol: 'WAVAX', 
  address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', 
  volume: 1000 
}

```
- **volume** represents the amount of a particular tokens to be borrowed during the arbitrage.
<br />

### bake() 👩‍🍳
- this method runs the bot by listening to every new block and executing arbitrage opportunities if they exist.
<br />

### taste() 🍰
- logs the prices of the tokens on the [pangolin](https://pangolin.exchange/) and [traderjoe](https://traderjoexyz.com/home#/) DEXes.
- logs the potential profit/loss realized if an arbitrage is attempted based on the current tokens prices.
![Screenshot (248)](https://user-images.githubusercontent.com/53357470/160957408-bfa8c628-baa0-45a8-bd82-d1f5be163d03.png)
<br />

### serve(endpoint) 🍽
- takes your `telegramApiEndpoint` url as parameter and notifies you with the info when an arbitrage is carried out.
<br />

### diners(guests) 👨‍👩‍👧‍👦
- takes the `guest` parameter as an arrays of chat_ids of the telegram accounts that subscribe to notifications when a trade is carried out.
- should not be called manually. the telegram bot handles it.
<br />
<br />
<br />

Written originally as a submission for [@cryptofishx](https://twitter.com/cryptofishx/status/1491621931866599426?s=20&t=LnQLaVok2Aww0-gCxqYQdQ) bounty.
