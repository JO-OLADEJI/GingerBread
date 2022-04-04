require('dotenv/config.js');
require('@nomiclabs/hardhat-waffle');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {

  'solidity': {
    compilers: [
      {
        version: '0.6.12'
      },
      {
        version: '0.8.0'
      },
      {
        version: '0.8.1'
      }
    ]
  },

  'defaultNetwork': 'ganache',

  'networks': {

    'ganache': {
      url: 'HTTP://127.0.0.1:7545',
      accounts: (!process.env.GANACHE_ADDR1_PRIVATE_KEY) ? 
      [`0x${process.env.GANACHE_PRIVATE_KEY}`]
      : 
      [`0x${process.env.GANACHE_PRIVATE_KEY}`, `0x${process.env.GANACHE_ADDR1_PRIVATE_KEY}`]
    },
    
    'fuji-testnet': {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      gasPrice: 225000000000,
      chainId: 43113,
      accounts: [`0x${process.env.PRIVATE_KEY}`]
    },

    'avalanche-mainnet': {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      gasPrice: 225000000000,
      chainId: 43114,
      accounts: [`0x${process.env.PRIVATE_KEY}`]
    }

  }
};
