const { ethers, BigNumber } = require('ethers');
const Joi = require('joi');
const axios = require('axios');

const convertToAvax = async (tokenAddress, quantity = 1) => {
  const addressPattern = Joi.string().length(42).lowercase().pattern(/^0x[a-f0-9]{40}$/);
  const { value, error } = addressPattern.validate(tokenAddress);
  if (error) {
    throw new Error(error['details'][0]['message']);
  }

  const api = 'https://api.traderjoexyz.com/priceavax/';
  const response = await axios.get(`${api}${tokenAddress}`);
  // const avaxValue = BigNumber.from((response.data).toString()).mul(BigNumber.from(quantity.toString()));
  const avaxRate = Number(ethers.utils.formatEther(BigNumber.from((response.data).toString())));
  return avaxRate * quantity;
}

module.exports = convertToAvax;