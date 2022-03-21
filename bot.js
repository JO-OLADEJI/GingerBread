require('dotenv/config.js');
// const Avalanche = require('avalanche').Avalanche;
const { ethers } = require('ethers');
const Web3 = require('web3');
const axios = require('axios');
const chalk = require('chalk');
const arbitrageABI = require('./artifacts/contracts/Arbitrage.sol/Arbitrage.json')['abi'];
const arbitrageAddress = '0xce144F329F42C7028B0335d7625515bDC7b25608';
const pangolin = require('./contractABIs/pangolin');
const traderjoe = require('./contractABIs/traderjoe');
const { abi } = require('@pangolindex/exchange-contracts/artifacts/contracts/pangolin-core/interfaces/IPangolinPair.sol/IPangolinPair.json');


/*
- This bot runs on the AVALANCHE C-CHAIN
- To configure it to run on another network, change the environment variables to point to a node running on another network
- This bot only works when one of the tokens compared is the native coin of the network - in this case WAVAX is the native coin of the AVALANCHE C-CHAIN
*/
class ArbitrageBot {

  amountToBorrow = 1000; // 1K AVAX
  flashLoanPremium = 0.0009;
  traderjoeSwapRate = 0.003;
  pangolinSwapRate = 0.003;
  signal = {
    'buyFrom': '',
    'buyAmount': 0,
    'sellTo': ''
    // sell amount would be the entire tokens
  }

  /**
   * 
   * @param {String} mode - 'testnet' or 'mainnet'
   * @param {Object} token0 - should have properties 'address' and 'symbol'
   * @param {Object} token1 - should have properties 'address' and 'symmbol'
   */
  constructor(mode, token0, token1) {
    if (mode === 'testnet') {
      this.web3Provider = new ethers.providers.JsonRpcProvider(process.env.TESTNET_NODE);
    }
    else if (mode === 'mainnet') {
      this.web3Provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_NODE);
    }
    else {
      throw new Error('Mode must be one of "testnet" or "mainnet"');
    }
    this.token0 = token0['address'];
    this.token0Symbol = token0['symbol'];
    this.token1 = token1['address'];
    this.token1Symbol = token1['symbol'];
  }

  checkLatestBlock = async () => {
    this.web3Provider.on('block', async (blockNumber) => {
      try {
        console.log('>> ' + chalk.blue('Current block: ') + chalk.green.bold(blockNumber) + '\n');
        // run arbitrage here
      }
      catch (err) {
        console.log(new Error(err.message));
      }
    });
  }


  getPangolinRate = async () => {
    try {
      const pangolinFactoryAddress = pangolin['ADDRESS'];
      const pangolinFactoryABI = pangolin['ABI'];
      const PangolinFactoryContract = new this.web3Provider.eth.Contract(pangolinFactoryABI, pangolinFactoryAddress);
      const pairAddress = await PangolinFactoryContract.methods.getPair(this.token0, this.token1).call();
      const ExchangeContract = await new this.web3Provider.eth.Contract(abi, pairAddress);
      const reserves = await ExchangeContract.methods.getReserves().call();
      // const rate = Number(reserves['reserve1']) / Number(reserves['reserve0']);
      const rate = Number(reserves['reserve0']) / Number(reserves['reserve1']);
      
      return rate;
    }
    catch (err) {
      console.log(new Error(err.message));
      return 0;
    }
  }

  getTraderjoeRate = async () => {
    try {
      // values in AVAX
      const baseUrl = 'https://api.traderjoexyz.com/priceavax/';
      const inputToken = await axios.get(baseUrl + this.token0);
      const outputToken = await axios.get(baseUrl + this.token1);
      const rate = Number(inputToken.data) / Number(outputToken.data);
      return rate;
    }
    catch (err) {
      console.log(new Error(err.message));
      return 0;
    }
  }

  compareDexes = async () => {
    const traderjoeRate = await this.getTraderjoeRate();
    const pangolinRate = await this.getPangolinRate();
    const difference = Math.abs(traderjoeRate - pangolinRate);
    
    return { traderjoeRate, pangolinRate };
  }

  tabulateResult = (traderjoeRate, pangolinRate, profit) => {
    const difference = Math.abs(traderjoeRate - pangolinRate);

    console.table([{
      'Input Token': this.token0Symbol,
      'Output Token': this.token1Symbol,
      'n': '1 Token',
      'Trader Joe': traderjoeRate,
      'Pangolin': pangolinRate,
      'difference': difference,
      'Lend': `${this.amountToBorrow} AVAX`, // total number of tokens that would be borrowed
      // 'Refund': this.calculateRefund(),
      // 'Profit': profit < 0 ? chalk.red(`${profit}`) : chalk.green(`${profit}`)
      // 'Profit': chalk.red(`${profit}`)
    }]);
  }

  generateSignal = () => {
    // 
  }

  // if flash loans is being used, loan will be repaid in token borrowed
  calculateRefundInAVAX = () => {
    return (1 + this.flashLoanPremium) * this.amountToBorrow;
  }

  // if flash loans is being used, loan can be repaid in other token
  calculateRefundInOtherCurrency = () => {
    // do something
  }

  // if flash loans is being used, loan will be repaid in token borrowed
  calculateProfitInAVAX = async () => {
    console.log(chalk.blue('\nBlock Number: ') + chalk.yellow.bold('543876421'));
    // take gas into consideration for swapping on both exchanges
    // take slippage into consideration

    // get the lower rate and the higher rate
    let minRate;
    let minRateExchange;
    let minRateExchangeFee;
    let maxRate;
    let maxRateExchange;
    let maxRateExchangeFee;

    const { traderjoeRate, pangolinRate } = await this.compareDexes();
    if (traderjoeRate < pangolinRate) {
      [minRate, minRateExchange, minRateExchangeFee] = [traderjoeRate, 'traderjoe', this.traderjoeSwapRate];
      [maxRate, maxRateExchange, maxRateExchangeFee] = [pangolinRate, 'pangolin', this.pangolinSwapRate];
    }
    else {
      [minRate, minRateExchange, minRateExchangeFee] = [pangolinRate, 'pangolin', this.pangolinSwapRate];
      [maxRate, maxRateExchange, maxRateExchangeFee] = [traderjoeRate, 'traderjoe', this.traderjoeSwapRate];
    }

    // buy output token with AVAX
    const buySwapRate = maxRateExchange === 'traderjoe' ? this.traderjoeSwapRate : this.pangolinSwapRate;
    const volumeOfOutputTokens = maxRate * this.amountToBorrow * (1 - buySwapRate);

    // sell output token for AVAX
    const sellSwapRate = minRateExchange === 'pangolin' ? this.pangolinSwapRate : this.traderjoeSwapRate;
    const volumeofInputTokens = (volumeOfOutputTokens / minRate) * (1 - sellSwapRate);

    // calculate profit
    const profit = volumeofInputTokens - this.calculateRefundInAVAX();

    // display table to the console
    this.tabulateResult(traderjoeRate, pangolinRate, profit);

    return profit;
  }

  // if flash loans is being used, loan can be repaid in other token
  calculateProfitInOtherCurrency = () => {
    // 
  }

  // TODO
  // 4. find significant difference between prices
  // 5. execute the flashloan contract

}


const aave = {
  symbol: 'AAVE.e',
  address: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9'
}
const joe = {
  symbol: 'JOE',
  address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd'
}
const wavax = {    // native coin to the AVALANCHE C-CHAIN
  symbol: 'WAVAX',
  address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'
}

const tradeBot = new ArbitrageBot('mainnet', wavax, joe);
tradeBot.checkLatestBlock();
// tradeBot.calculateProfitInAVAX()
// .then((profit) => {
//   console.log('{ ' + chalk.blue('Profit: ') + chalk.red.bold(`${profit} AVAX`) + ' }\n\n');
// });

// const calculateTime = async () => {
//   const startTime = Date.now();
//   // -------------------------------------------
//   const profit = await tradeBot.calculateProfitInAVAX();
//   // -------------------------------------------
//   const endTime = Date.now();

//   console.log(chalk.blue('Profit Calculation - execution time: ') + chalk.yellow.bold(`${endTime - startTime} ms`))
// };
// calculateTime();

// const ArbitrageContract = new web3HttpsTestnet.eth.Contract(arbitrageABI, arbitrageAddress);
// we now have the contract to call the flash loan 👆 - Note: it's on fuji testnet


// 1. listen to mined blocks on the avalanche blockchain
// let lastBlock = 0;
// const checkLatestBlock = async () => {
//   try {
//     const latestBlock = await web3HttpsMainnet.eth.getBlockNumber();
//     if (latestBlock > lastBlock) {
//       // check for the arbitrage opportunity here ->
//       lastBlock = latestBlock;
//       console.log(lastBlock);
//     }

//     setTimeout(() => checkLatestBlock(), 1 * 1000);
//   }
//   catch (err) {
//     console.log(new Error(err.message));
//   }
// };
// checkLatestBlock();
