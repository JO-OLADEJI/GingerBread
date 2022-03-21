require('dotenv').config();
const { ethers } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_NODE);
// console.log(provider);

const run = async () => {
  provider.on('block', async (blockNumber) => {
    try {
      console.log(blockNumber);
    }
    catch (err) {
      console.log(new Error(err.message));
    }
  });
}
run();