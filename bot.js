require('dotenv/config.js');
const { ethers } = require('ethers');
const chalk = require('chalk');
const pangolin = require('./dex/pangolin.js');
const traderjoe = require('./dex/traderjoe.js');
const { abi: pangolinPairAbi } = require('@pangolindex/exchange-contracts/artifacts/contracts/pangolin-core/interfaces/IPangolinPair.sol/IPangolinPair.json');
const { abi: traderjoePairAbi } = require('@traderjoe-xyz/core/artifacts/contracts/traderjoe/interfaces/IJoePair.sol/IJoePair.json');
// const arbitrageABI = require('./artifacts/contracts/Arbitrage.sol/Arbitrage.json')['abi'];
// const arbitrageAddress = '0xce144F329F42C7028B0335d7625515bDC7b25608';


/*
- This bot runs on the AVALANCHE C-CHAIN
- To configure it to run on another network, change the environment variables to point to a node running on another network
- This bot only works when one of the tokens compared is the native coin of the network - in this case WAVAX is the native coin of the AVALANCHE C-CHAIN
*/
class ArbitrageBot {

  TOKEN0_TRADE = 1000; // aka WAVAX
  TOKEN1_TRADE = 100000; // other TOKEN
  pangolinSwapRate = 0.3; // 0.3%
  traderjoeSwapRate = 0.3; // 0.3%

  /**
   * 
   * @param {String} mode - 'testnet' or 'mainnet'
   * @param {Object} token0 - should have properties 'address' and 'symbol'
   * @param {Object} token1 - should have properties 'address' and 'symmbol'
   */
  constructor(mode, token0, token1) {
    if (mode === 'testnet') {
      this.web3Provider = new ethers.providers.JsonRpcProvider(process.env.TESTNET_NODE);
      this.wallet = new ethers.Wallet(process.env.AVALANCHE_TEST_PRIVATE_KEY, this.web3Provider);
    }
    else if (mode === 'mainnet') {
      this.web3Provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_NODE);
      this.wallet = new ethers.Wallet(process.env.AVALANCHE_MAIN_PRIVATE_KEY, this.web3Provider);
    }
    else {
      throw new Error('Mode must be one of "testnet" or "mainnet"');
    }
    this.token0 = token0['address'];
    this.token0Symbol = token0['symbol'];
    this.token1 = token1['address'];
    this.token1Symbol = token1['symbol'];
    this.flashloanContractAddress = '';
  }


  run = async () => {
    // - load contracts from pangolin
    const PangolinFactory = new ethers.Contract(pangolin['ADDRESS'], pangolin['ABI'], this.wallet);
    const pangolinPairAddress = await PangolinFactory.getPair(this.token0, this.token1);
    const pangolinPair = new ethers.Contract(pangolinPairAddress, pangolinPairAbi, this.wallet);
    return console.log({ pangolinPairAddress });

    // - load contracts from traderjoe
    const TraderjoeFactory = new ethers.Contract(traderjoe['ADDRESS'], traderjoe['ABI'], this.wallet);
    const traderjoePairAddress = await TraderjoeFactory.getPair(this.token0, this.token1);
    const TraderjoePair = new ethers.Contract(traderjoePairAddress, traderjoePairAbi, this.wallet);

    // - listen to every mined block
    this.web3Provider.on('block', async (blockNumber) => {
      try {
        console.log('\n\n>> ' + chalk.blue('Current block: ') + chalk.green.bold(blockNumber));
        
        // - get price from pangolin
        const pangolinReserves = await pangolinPair.getReserves();
        const pangolinReserve0 = Number(ethers.utils.formatUnits(pangolinReserves[0], 18));
        const pangolinReserve1 = Number(ethers.utils.formatUnits(pangolinReserves[1], 18));
        const pangolinPrice = pangolinReserve0 / pangolinReserve1;

        // - get price from trader joe
        const traderjoeReserves = await TraderjoePair.getReserves();
        const traderjoeReserve0 = Number(ethers.utils.formatUnits(traderjoeReserves[0], 18));
        const traderjoeReserve1 = Number(ethers.utils.formatUnits(traderjoeReserves[1], 18));
        const traderjoePrice = traderjoeReserve0 / traderjoeReserve1;

        // - check if trade is profitable
        const shouldStartToken0 = pangolinPrice < traderjoePrice;
        const spread = Math.abs((traderjoePrice / pangolinPrice - 1) * 100) - (this.pangolinSwapRate + this.traderjoeSwapRate);
        const shouldTrade = spread > (
          (shouldStartToken0 ? this.TOKEN0_TRADE : this.TOKEN1_TRADE)
          / Number(ethers.utils.formatEther(pangolinReserves[shouldStartToken0 ? 1 : 0]))
        );
        
        // - tabulate the result to the console
        this.tabulateResult(traderjoePrice, pangolinPrice, spread);

        // calculate gas to be used for transaction
        if (shouldTrade) {
          // const gasLimit = await TraderjoePair.estimateGas.swap(
          //   !shouldStartToken0 ? this.TOKEN2_TRADE : 0,
          //   shouldStartToken0 ? this.TOKEN1_TRADE : 0,
          //   // this.flashloanContractAddress,
          //   ethers.utils.toUtf8Bytes('1'),
          // );
          const gasLimit = await TraderjoePair.estimateGas.swap(
            shouldStartToken0 ? this.TOKEN0_TRADE : 0,
            !shouldStartToken0 ? this.TOKEN1_TRADE : 0,
            // this.flashloanContractAddress,
            ethers.utils.toUtf8Bytes('1'),
          );
          const gasPrice = await this.wallet.getGasPrice();
          const gasCost = Number(ethers.utils.formatEther(gasPrice.mul(gasLimit)));
  
  
  
          console.log({ 'shouldTrade?': shouldTrade });
          console.log({ 'gasCost': gasCost });
        }
        else {
          // do nothing - wait for the next block
        }
      }
      catch (err) {
        console.log(new Error(err.message));
      }
    });
  }


  tabulateResult = (traderjoeRate, pangolinRate, spread) => {
    console.table([{
      'Token0': this.token0Symbol,
      'Token1': this.token1Symbol,
      'n': '1 Token',
      'Trader Joe': traderjoeRate,
      'Pangolin': pangolinRate,
      'spread': spread,
      // 'Lend': `${this.amountToBorrow} AVAX`,
      // 'Refund': this.calculateRefund(),
      // 'Profit': profit < 0 ? chalk.red(`${profit}`) : chalk.green(`${profit}`)
      // 'Profit': chalk.red(`${profit}`)
    }]);
  }

}




// make WAVAX the second parameter
// const tradeBot = new ArbitrageBot(
//   'mainnet', 
//   { symbol: 'WAVAX', address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' }, 
//   { symbol: 'JOE', address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd' }
// );
const tradeBot = new ArbitrageBot(
  'testnet', 
  { symbol: 'WAVAX', address: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c' }, 
  { symbol: 'AAVE', address: '0xdA396746625EcE2C60935E4f74f16e289f111662' }
);

tradeBot.run();
