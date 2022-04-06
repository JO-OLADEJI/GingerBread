require('dotenv').config();
const { ethers } = require('ethers');
const flashSwap = require('./artifacts/contracts/FlashSwapper.sol/FlashSwapper.json');

const web3Provider = new ethers.providers.JsonRpcProvider(process.env.C_CHAIN_NODE);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, web3Provider);
const FlashSwapContract = new ethers.Contract(process.env.FLASH_SWAP_ADDRESS, flashSwap['abi'], wallet);

/**
 * @async function to add gas to the contract
 * @param {String} value amount of AVAX to add to contract
 * @returns {String} transaction hash
 */
const exec = async (value) => {
  try {
    const amount = ethers.utils.parseEther(value);
    const tx = await FlashSwapContract.addGas({ 'value': amount });
    await tx.wait();
    console.log({ 'hash': tx.hash });
    return tx.hash;
  }
  catch (err) {
    console.log(new Error(err.message));
  }
}
// exec('0.5');