const { expect } = require("chai");

describe("HelloWorld contract", function () {

  it("Deployment should set the initial message", async function () {
    const [owner] = await ethers.getSigners();

    const HelloWorld = await ethers.getContractFactory("HelloWorld");

    const initialMessage = "Hello World!";
    const helloWorldContract = await HelloWorld.deploy(initialMessage);

    expect(await helloWorldContract.message()).to.equal(initialMessage);
  });

  it("Updating overwrites the message", async function () {
    const [owner, user1, user2] = await ethers.getSigners();

    const HelloWorld = await ethers.getContractFactory("HelloWorld");
    const helloWorldContract = await HelloWorld.deploy("I'm first");

    await helloWorldContract.connect(user1).update("This is user 1")
    expect(await helloWorldContract.message()).to.equal("This is user 1");

    await helloWorldContract.connect(user2).update("It's user1 no more")
    expect(await helloWorldContract.message()).to.equal("It's user1 no more");
  });
  
});