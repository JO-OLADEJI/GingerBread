require('dotenv/config.js');
// const Avalanche = require('avalanche').Avalanche;
const { ethers } = require('ethers');
const axios = require('axios');
const chalk = require('chalk');
const arbitrageABI = require('./artifacts/contracts/Arbitrage.sol/Arbitrage.json')['abi'];
const arbitrageAddress = '0xce144F329F42C7028B0335d7625515bDC7b25608';
const pangolin = require('./contractABIs/pangolin');
const traderjoe = require('./contractABIs/traderjoe');
const { abi: pangolinPairAbi } = require('@pangolindex/exchange-contracts/artifacts/contracts/pangolin-core/interfaces/IPangolinPair.sol/IPangolinPair.json');


/*
- This bot runs on the AVALANCHE C-CHAIN
- To configure it to run on another network, change the environment variables to point to a node running on another network
- This bot only works when one of the tokens compared is the native coin of the network - in this case WAVAX is the native coin of the AVALANCHE C-CHAIN
*/
class ArbitrageBot {

  amountToBorrow = 1000; // 1K AVAX
  flashLoanPremium = 0.0009;
  
  signal = {
    'buyFrom': '',
    'buyAmount': 0,
    'sellTo': ''
    // sell amount would be the entire tokens
  }

  TOKEN1_TRADE = 1000;
  TOKEN2_TRADE = 100000;
  traderjoeSwapRate = 0.003; // 0.3%
  pangolinSwapRate = 0.003; // 0.3%
  amountOfToken0ToBorrow = 1000;

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

  run = async () => {
    this.web3Provider.on('block', async (blockNumber) => {
      try {
        console.log('\n\n>> ' + chalk.blue('Current block: ') + chalk.green.bold(blockNumber));
        
        // - get price from pangolin
        const PangolinFactory = new ethers.Contract(pangolin['ADDRESS'], pangolin['ABI'], this.wallet);
        const pangolinPairAddress = await PangolinFactory.getPair(this.token0, this.token1);
        const pangolinPair = new ethers.Contract(pangolinPairAddress, pangolinPairAbi, this.wallet);
        const pangolinReserves = await pangolinPair.getReserves();
        const pangolinReserve0 = Number(ethers.utils.formatUnits(pangolinReserves[0], 18));
        const pangolinReserve1 = Number(ethers.utils.formatUnits(pangolinReserves[1], 18));
        const pangolinPrice = pangolinReserve0 / pangolinReserve1;

        // - get price from trader joe
        const TraderjoeFactory = new ethers.Contract(traderjoe['ADDRESS'], traderjoe['ABI'], this.wallet);
        const traderjoePairAddress = await TraderjoeFactory.getPair(this.token0, this.token1);
        const TraderjoePair = new ethers.Contract(traderjoePairAddress, traderjoe['PAIR_ABI'], this.wallet);
        const traderjoeReserves = await TraderjoePair.getReserves();
        const traderjoeReserve0 = Number(ethers.utils.formatUnits(traderjoeReserves[0], 18));
        const traderjoeReserve1 = Number(ethers.utils.formatUnits(traderjoeReserves[1], 18));
        const traderjoePrice = traderjoeReserve0 / traderjoeReserve1;

        // - tabulate the result to the console
        this.tabulateResult(traderjoePrice, pangolinPrice);

        // // - check if trade is profitable
        // let borrowFrom;
        // let profit;
        // if (pangolinPrice < traderjoePrice) { // it means token0 is worth less on pangolin
        //   borrowFrom = 'pangolin';

        //   // TODO
        //   // 1. calculate the potential profit from difference with account to no gas
        //   const potentialprofitWithFeesInToken0 = ((this.amountOfToken0ToBorrow * (traderjoePrice - pangolinPrice)) / traderjoePrice) * 0.994;

        //   // 2. calculate the gas fee on swapping
        //   const gasLimit = await pangolinPair.estimateGas.swap(
        //     0,
        //     this.amountOfToken0ToBorrow,
        //     '0xAC14513E6B0e6D403592CbB21E0E044726CcF3E4',
        //     ethers.utils.toUtf8Bytes('1')
        //   );
        //   const gasPrice = await wallet.getGasPrice();
        //   const gasFee = gasLimit * gasPrice;

        //   // 3. find the difference between potential profit and gas fees
        //   profit = potentialprofitWithFeesInToken0 - gasFee;
        // }
        // else if (pangolinPrice > traderjoePrice) { // it means token0 is worth less on traderjoe
        //   // I DIDN'T IMPLEMENT THIS CAUSE I COULDN'T FIND THE CONTRACT CONTAINING TRADER JOE'S swap() FUNCTION
        // }

        // console.log({ borrowFrom, profit });

      }
      catch (err) {
        console.log(new Error(err.message));
      }
    });
    // do the entire thing here
  }

  compareDexes = async () => {
    const traderjoePrice = await this.getTraderjoePrice();
    const pangolinPrice = await this.getPangolinPrice();
    const absSpread = Math.abs((traderjoePrice / pangolinPrice - 1) * 100) - 0.6;
    const spread = Math.abs(traderjoePrice - pangolinPrice);

    console.log({ traderjoePrice, pangolinPrice });
    console.log({ absSpread });
    console.log({ spread });
    
    // return { traderjoeRate: traderjoePrice, pangolinRate: pangolinPrice };
  }

  shouldTrade = async () => {
    const traderjoePrice = await this.getTraderjoePrice();
    const pangolinPrice = await this.getPangolinPrice();
    const absSpread = Math.abs((traderjoePrice / pangolinPrice - 1) * 100) - 0.6;
    // const spread = Math.abs(traderjoePrice - pangolinPrice);

    // let shouldStartToken0;
    // let shouldStartToken1;


    // const gasLimit = await sushiEthDai.estimateGas.swap(
    //   !shouldStartEth ? DAI_TRADE : 0,
    //   shouldStartEth ? ETH_TRADE : 0,
    //   flashLoanerAddress,
    //   ethers.utils.toUtf8Bytes('1'),
    // );

    // const gasPrice = await this.wallet.getGasPrice();
    // const gasCost = Number(ethers.utils.formatEther(gasPrice.mul(gasLimit)));
  }

  tabulateResult = (traderjoeRate, pangolinRate) => {
    const difference = Math.abs(traderjoeRate - pangolinRate);

    console.table([{
      'Token0': this.token0Symbol,
      'Token1': this.token1Symbol,
      'n': '1 Token',
      'Trader Joe': traderjoeRate,
      'Pangolin': pangolinRate,
      'difference': difference,
      // 'Lend': `${this.amountToBorrow} AVAX`,
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

}




// make WAVAX the second parameter
const tradeBot = new ArbitrageBot(
  'mainnet', 
  { symbol: 'WAVAX', address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' }, 
  { symbol: 'JOE', address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd' }
);

tradeBot.run();
