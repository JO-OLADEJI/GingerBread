const { ethers } = require('ethers');
const Joi = require('joi');
const erc20Abi = require('@traderjoe-xyz/core/abi/ERC20.json');

class ERC20 {

  /**
   * @param {String} token token address of erc20 token
   */
  constructor(token) {
    const pattern = Joi.string().length(42).lowercase().pattern(/^0x[a-f0-9]{40}$/);
    const { value, error } = pattern.validate(token);
    if (error) {
      throw new Error(error['details'][0]['message']);
    }

    const provider = new ethers.providers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
    this.ERC20Contract = new ethers.Contract(
      value,
      erc20Abi,
      provider
    );
  }

  name = async () => {
    const tokenName = await this.ERC20Contract.name();
    return tokenName;
  }

  symbol = async () => {
    const tokenSymbol = await this.ERC20Contract.symbol();
    return tokenSymbol;
  }

  decimals = async () => {
    const tokenDecimal = await this.ERC20Contract.decimals();
    return tokenDecimal;
  }

}

module.exports = ERC20;