module.exports = async function getMessage() {

  const HelloWorld = await ethers.getContractFactory("HelloWorld");
  const helloWorldContract = await HelloWorld.attach('0x6Afa262bA937352284f5EC8C5570530D677e1566');
  const message = await helloWorldContract.message();
  return message;
  
  // const newMessage = 'My name is Joshua Oladjei';
  // helloWorldContract
  //   .update(newMessage)
  //   .then(() => helloWorldContract.message())
  //   .then((message) => console.log(message))
  //   .catch((err) => console.log(new Error(err.message)));
  // console.log("Current message:", await helloWorldContract.message())
}

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });