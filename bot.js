require('dotenv/config.js');
// const avalanche = require('avalanche').Avalanche;
const Web3 = require('web3');
const arbitrageABI = require('./artifacts/contracts/Arbitrage.sol/Arbitrage.json')['abi'];
const arbitrageAddress = '0xce144F329F42C7028B0335d7625515bDC7b25608';

const web3 = new Web3('https://api.avax-test.network/ext/bc/C/rpc');
const ArbitrageContract = new web3.eth.Contract(arbitrageABI, arbitrageAddress);

console.log(ArbitrageContract['_address']);
