require('dotenv/config.js');


const main = async () => {
  const pangolinFactory = '0xefa94DE7a4656D787667C749f7E1223D71E9FD88';
  const traderjoeRouter = '0x60aE616a2155Ee3d9A68541Ba4544862310933d4';
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const FlashSwapper = await ethers.getContractFactory("FlashSwapper");
  const FlashSwapperContract = await FlashSwapper.deploy(pangolinFactory, traderjoeRouter);

  console.log("FlashSwapper address:", FlashSwapperContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });