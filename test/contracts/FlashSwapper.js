const { expect } = require("chai");
const { ethers } = require("hardhat");


describe('FlashSwapper', () => {
  let deployer;
  let addr1;
  let contract;
  beforeEach(async () => {
    const pangolinFacory = '0xefa94DE7a4656D787667C749f7E1223D71E9FD88';
    const joeRouter = '0x60aE616a2155Ee3d9A68541Ba4544862310933d4';
    [deployer, addr1] = await ethers.getSigners();
    const FlashSwapper = await ethers.getContractFactory('FlashSwapper');
    contract = await FlashSwapper.deploy(pangolinFacory, joeRouter);
  });
  afterEach(() => {
    // -> cleanup
    deployer = null;
    contract = null;
  });


  describe('Constructor', () => {

    it('should assign contractOwner to deployer address', async () => {
      const contractOwner = await contract.contractOwner();
      expect(deployer['address']).to.equal(contractOwner);
    });

  });


  describe('Tx functions', () => {

    it('should have a balance of value sent if addGas() is called', async () => {
      const value = ethers.utils.parseEther('1');
      await contract.addGas({ value });
      const contractBalance = await ethers.provider.getBalance(contract['address']);
      expect(contractBalance.toString()).to.equal(value.toString());
    });

    it('should have a balance incremented by the value sent if contract has a balance greater than zero', async () => {
      const initialBalance = ethers.utils.parseEther('1');
      await contract.addGas({ 'value': initialBalance });
      const increment = ethers.utils.parseEther('1');
      await contract.addGas({ 'value': increment });
      const total = initialBalance.add(increment);
      const contractBalance = await ethers.provider.getBalance(contract['address']);
      expect(total.toString()).to.equal(contractBalance.toString());
    });

    it('should withdraw the entire balance of contract if withdraw() is called by contract owner', async () => {
      await contract.withdraw();
      const contractBalance = await ethers.provider.getBalance(contract['address']);
      expect(contractBalance.toString()).to.equal('0');
    });

    it('should revert transaction if withdraw() is called by another address other than the contract owner', async () => {
      await expect(
        contract.connect(addr1).withdraw()
      ).to.be.revertedWith('UNAUTHORIZED!');
    });

    it('should return contract balance if checkGas() is called by contract owner', async () => {
      const balance = await contract.checkGas();
      expect(balance.toString()).to.equal('0');
    });

    it('should return contract balance if checkGas() is called by another address other than the contract owner', async () => {
      const balance = await contract.connect(addr1).checkGas();
      expect(balance.toString()).to.equal('0');
    });

  });

});