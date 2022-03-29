require('dotenv/config.js');


const main = async () => {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const FlashSwapper = await ethers.getContractFactory("FlashSwapper");
  const FlashSwapperContract = await FlashSwapper.deploy(/*pangolinFactory, traderjoeRouter*/);

  console.log("FlashSwapper address:", FlashSwapperContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });