require('dotenv/config.js');
const Avalanche = require('avalanche').Avalanche;
const Web3 = require('web3');
const arbitrageABI = require('./artifacts/contracts/Arbitrage.sol/Arbitrage.json')['abi'];
const arbitrageAddress = '0xce144F329F42C7028B0335d7625515bDC7b25608';
const pangolin = require('./contractABIs/pangolin');
const traderjoe = require('./contractABIs/traderjoe');
const { abi } = require('@pangolindex/exchange-contracts/artifacts/contracts/pangolin-core/interfaces/IPangolinPair.sol/IPangolinPair.json');

// addresses of the coins present in the pair we want to check
const otherCoinAddress = '0x63a72806098Bd3D9520cC43356dD78afe5D386D9'; // AAVE - mainnet
const nativeCoinAddress = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'; // WAVAX - mainnet (The native currency of the avalanche C-chain)

// web3 instances for the fuji testnet and avalanche mainnet on HTTPS and web socket
const web3HttpsTestnet = new Web3(process.env.MORALIS_FUJI_NODE);
const web3WebSocketTestnet = new Web3(process.env.MORALIS_FUJI_WEB_SOCKET_NODE);
const web3HttpsMainnet = new Web3(process.env.MORALIS_MAINNET_NODE);
const web3WebSocketMainnet = new Web3(process.env.MORALIS_MAINNET_WEB_SOCKET_NODE);


const getPangolinPairReserves = async (_web3Instance, _factoryContract, _otherCoinAddress) => {
  try {
    const pairAddress = await _factoryContract.methods.getPair(_otherCoinAddress, nativeCoinAddress).call();
    const ExchangeContract = await new _web3Instance.eth.Contract(abi, pairAddress);
    const reserves = await ExchangeContract.methods.getReserves().call();
    console.log(reserves);
    return reserves;
  }
  catch (error) {
    console.log(new Error(error.message));
    return 0;
  }
}

// const getTraderjoePairReserves = async (_web3Instance, _factoryContract, _otherCoinAddress) => {
//   try {
//     const pairAddress = await _factoryContract.methods.getPair(_otherCoinAddress, nativeCoinAddress).call();
//     const ExchangeContract = await new _web3Instance.eth.Contract(traderjoe['EXCHANGE_ABI'], pairAddress);
//     // const reserves = await ExchangeContract.methods.getReserves().call();
//     console.log(typeof ExchangeContract.methods);
//   }
//   catch (error) {
//     console.log(new Error(error.message));
//     return 0;
//   }
// }


const ArbitrageContract = new web3HttpsTestnet.eth.Contract(arbitrageABI, arbitrageAddress);
// we now have the contract to call the flash loan 👆 - Note: it's on fuji testnet


// TODO
// 1. listen to mined blocks on the avalanche blockchain
const checkLatestBlock = async () => {
  try {
    const latestBlock = await web3HttpsMainnet.eth.getBlock('latest');
    const latestBlockNumber = latestBlock['number'];
    console.log(latestBlock);

    setTimeout(() => checkLatestBlock(), 3 * 1000);
  }
  catch (err) {
    console.log(new Error(err.message));
  }
};
// checkLatestBlock();


// 2. get given crypto pair rate from pangolin
const pangolinFactoryAddress = pangolin['ADDRESS'];
const pangolinFactoryABI = pangolin['ABI'];
const PangolinFactoryContract = new web3HttpsMainnet.eth.Contract(pangolinFactoryABI, pangolinFactoryAddress);
// getPangolinPairReserves(mainnetWeb3, PangolinFactoryContract, otherCoinAddress);


// 3. get given crypto pair rate from trader joe
// const traderjoeFactoryAddress = traderjoe['ADDRESS'];
// const traderjoeFactoryABI = traderjoe['ABI'];
// const TraderjoeFactoryContract = new web3HttpsMainnet.eth.Contract(traderjoeFactoryABI, traderjoeFactoryAddress);
// getTraderjoePairReserves(mainnetWeb3, TraderjoeFactoryContract, otherCoinAddress);


// 4. find significant difference between prices
// 5. execute the flashloan contract
