require('dotenv/config.js');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Arbitrage = await ethers.getContractFactory("Arbitrage");
  const ArbitrageContract = await Arbitrage.deploy(process.env.AAVE_LENDING_POOL_V2_FOR_AVAX_FUJI);

  console.log("Arbitrage address:", ArbitrageContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });