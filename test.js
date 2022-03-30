require('dotenv').config();
const { ethers } = require('ethers');
const pangolin = require('./dex/pangolin.js');
const abi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "save",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "savings",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

const web3Provider = new ethers.providers.JsonRpcProvider(process.env.C_CHAIN_NODE);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, web3Provider);
const TestContract = new ethers.Contract('0x0D08Bd9A77c23ab2aB3F8de9473Ca46268c8a94A', abi, wallet);


const test = async () => {
  const gasLimit = await TestContract.estimateGas.save(10);
  const gasPrice = await wallet.getGasPrice();
  const gasCost = Number(ethers.utils.formatEther(gasPrice.mul(gasLimit)));
  console.log({ 'gasLimit': gasLimit.toString(), 'gasPrice': gasPrice.toString() });
  console.log({ gasCost });
}
test();

console.log(ethers.utils.parseEther('1000').toString())