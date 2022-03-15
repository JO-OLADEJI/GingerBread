//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// We import this library to be able to use console.log
import "hardhat/console.sol";

contract HelloWorld {
  string public message;
  
  constructor(string memory initMessage) {
    message = initMessage;
  }
  
  function update(string memory newMessage) public {
    console.log("Address %s updating message", msg.sender);
    message = newMessage;
  }
}