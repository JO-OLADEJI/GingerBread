require('dotenv/config.js');
const Avalanche = require('avalanche').Avalanche;
const Web3 = require('web3');
const arbitrageABI = require('./artifacts/contracts/Arbitrage.sol/Arbitrage.json')['abi'];
const arbitrageAddress = '0xce144F329F42C7028B0335d7625515bDC7b25608';
const pangolin = require('./contractABIs/pangolin');
const traderjoe = require('./contractABIs/traderjoe');
const { abi } = require('@pangolindex/exchange-contracts/artifacts/contracts/pangolin-core/interfaces/IPangolinPair.sol/IPangolinPair.json');

// addresses of the coins present in the pair we want to check
const baseCoinAddress = '0x63a72806098Bd3D9520cC43356dD78afe5D386D9'; // AAVE - mainnet
const quoteCoinAddress = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'; // WAVAX - mainnet

// web3 instances for the fuji testnet and avalanche mainnet
const testnetWeb3 = new Web3(process.env.AVAX_FUJI_NODE_URL);
const mainnetWeb3 = new Web3(process.env.AVAX_MAINNET_NODE_URL);


// const getPairAddress = async (_factoryContract, _baseCoinAddress, _quoteCoinAddress) => {
//   const rate = await _factoryContract.methods.getPair(_baseCoinAddress, _quoteCoinAddress).call();
//   return rate;
// }

const getPairRatio = async (_exchangeAbi, _web3Instance, _factoryContract, _baseCoinAddress, _quoteCoinAddress) => {
  try {
    const pairAddress = await _factoryContract.methods.getPair(_baseCoinAddress, _quoteCoinAddress).call();
    const ExchangeContract = await new _web3Instance.eth.Contract(_exchangeAbi, pairAddress);
    const reserves = await ExchangeContract.methods.getReserves().call();
    const { reserve0, reserve1 } = await reserves;
    const ratio = Number(reserve1) / Number(reserve0);
    return ratio;
  }
  catch (error) {
    console.log(new Error(error.message));
    return 0;
  }
}


const ArbitrageContract = new testnetWeb3.eth.Contract(arbitrageABI, arbitrageAddress);
// we now have the contract to call the flash loan 👆


// TODO
// 1. listen to mined blocks on the avalanche blockchain

// 2. get given crypto pair rate from pangolin
const pangolinFactoryAddress = pangolin['ADDRESS'];
const pangolinFactoryABI = pangolin['ABI'];
const PangolinFactoryContract = new mainnetWeb3.eth.Contract(pangolinFactoryABI, pangolinFactoryAddress);
getPairRatio(abi, mainnetWeb3, PangolinFactoryContract, baseCoinAddress, quoteCoinAddress);


// 3. get given crypto pair rate from trader joe
// const traderjoeFactoryAddress = traderjoe['ADDRESS'];
// const traderjoeFactoryABI = traderjoe['ABI'];
// const TraderjoeFactoryContract = new mainnetWeb3.eth.Contract(traderjoeFactoryABI, traderjoeFactoryAddress);

// getPairAddress(PangolinFactoryContract, baseCoinAddress, quoteCoinAddress);



// 4. find significant difference between prices
// 5. execute the flashloan contract
