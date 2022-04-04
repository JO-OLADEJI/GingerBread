// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "@pangolindex/exchange-contracts/contracts/pangolin-core/interfaces/IERC20.sol";
import "@pangolindex/exchange-contracts/contracts/pangolin-core/interfaces/IPangolinCallee.sol";
import "@pangolindex/exchange-contracts/contracts/pangolin-core/interfaces/IPangolinPair.sol";
import "@pangolindex/exchange-contracts/contracts/pangolin-periphery/libraries/PangolinLibrary.sol";
import "@pangolindex/exchange-contracts/contracts/pangolin-lib/libraries/TransferHelper.sol";
import "@traderjoe-xyz/core/contracts/traderjoe/interfaces/IJoeRouter02.sol";



contract FlashSwapper is IPangolinCallee {

    address public immutable pangolinFactory;
    uint public constant deadline = 30000 days;
    IJoeRouter02 public immutable joeRouter;
    address public immutable contractOwner;

    /**
     * @dev initialize the contract with pangolin factory and joe router addresses for swap back and forth both exchanges
     * @param _pangolinFactory factory contract address of pangolin exchange
     * @param _joeRouter router contract address of traderjoe_xyz exchange
     */
    constructor(address _pangolinFactory, address _joeRouter) public {
        pangolinFactory = _pangolinFactory;
        joeRouter = IJoeRouter02(_joeRouter);
        contractOwner = msg.sender;
    }


    modifier onlyDeployer {
        require(msg.sender == contractOwner, "UNAUTHORIZED!");
        _;
    }


    /**
     * @dev events to broadcast when transactions are made on this contract
     */
    event Trade(address token, uint256 profit); // successful arbitrage
    event GasAdded(address depositor, uint256 value);
    event Withdraw(address sender, uint256 amount);


    /**
     * @dev function to borrow ERC20 token from pangolin
     * @param _pairAddress pair address of token pair on pangolin exchange
     * @param _tokenToBorrow address of ERC20 token to borrow - must be one of the tokens in the above pair
     * @param _amountToBorrow amount of above ERC20 token to borrow - in wei
     */
    function flashSwap(
        address _pairAddress,
        address _tokenToBorrow, 
        uint256 _amountToBorrow
    ) external {

        // fetch the address of token0 and token1
        address token0 = IPangolinPair(_pairAddress).token0();
        address token1 = IPangolinPair(_pairAddress).token1();
        require(token0 != address(0), "PAIR_NOT_FOUND!");
        require(token1 != address(0), "PAIR_NOT_FOUND!");

        // - assign the _amountToBorrow to the correct token
        uint256 amount0Out = _tokenToBorrow == token0 ? _amountToBorrow : 0;
        uint256 amount1Out = _tokenToBorrow == token1 ? _amountToBorrow : 0;

        bytes memory data = abi.encode(_tokenToBorrow, _amountToBorrow);
        /**
         * @dev borrow specified amount of token from pangolin - this function calls the [pangolinCall] function below to get it's asset back
         */
        IPangolinPair(_pairAddress).swap(amount0Out, amount1Out, address(this), data);

    }


    /**
     * @dev function to return borrowed amount equivalent - in the other token of the pair
     * @param _sender the pair address of token pair on pangolin
     * @param _amount0 amount of token0 to borrow
     * @param _amount1 amount of token1 to borrow
     * @param _data abi encoded data containing the address and amount of token to borrow
     */
    function pangolinCall(
        address _sender, 
        uint256 _amount0, 
        uint256 _amount1, 
        bytes calldata _data
    ) external override {

        // - path array to hold tokens' addresses
        address[] memory path = new address[](2);

        // - fetch the address of token0 and token1 - this time it's the pair address that is calling the contract as msg.sender
        address token0 = IPangolinPair(msg.sender).token0(); 
        address token1 = IPangolinPair(msg.sender).token1();
        address pair = PangolinLibrary.pairFor(pangolinFactory, token0, token1);

        // - just doing due diligence to make sure it's the pair address calling this function
        require(msg.sender == pair, "UNAUTHORIZED!");
        require(_sender == address(this), "NOT_SENDER!");
        require(_amount0 == 0 || _amount1 == 0, 'ONE_MANDATORY_ZERO_AMOUNT!');
        require(token0 != address(0), "PAIR_NOT_FOUND!"); // incase this function is initiated outside this contract
        require(token1 != address(0), "PAIR_NOT_FOUND!"); // incase this function is initiated outside this contract

        // - set the correct order of tokens in path array
        path[0] = _amount0 == 0 ? token0 : token1;
        path[1] = _amount0 == 0 ? token1 : token0;

        // - decode the data passed to the swap function
        (address _tokenToBorrow, uint256 _amountToBorrow) = abi.decode(_data, (address, uint256));

        // - approve spending of borrowed token
        IERC20 token = IERC20(_tokenToBorrow);
        token.approve(address(joeRouter), _amountToBorrow);

        // no need for require() check, if amount required is not sent pangolinRouter will revert
        uint amountRequired = PangolinLibrary.getAmountsIn(pangolinFactory, _amountToBorrow, path)[0];

        // Need to alternate paths for swapExactTokensForTokens
        path[0] = _amount0 == 0 ? token1 : token0;
        path[1] = _amount0 == 0 ? token0 : token1;

        // - swap tokens on traderjoe
        uint amountReceived = joeRouter.swapExactTokensForTokens(_amountToBorrow, amountRequired, path, address(this), deadline)[1];
        assert(amountReceived > amountRequired); // fail if we didn't get enough tokens back to repay our flash swap

        // - set token to payback to other token in the pair
        token = IERC20(_amount0 == 0 ? token0 : token1);

        // - transfer other token back to it's contract address
        TransferHelper.safeTransfer(address(token), msg.sender, amountRequired); // return tokens to Pangolin pair
        TransferHelper.safeTransfer(address(token), contractOwner, amountReceived - amountRequired); // PROFIT!!!

        // - emit the trade event
        emit Trade(address(token), amountReceived - amountRequired);

    }


    /**
     * @dev function to deposit avax to contract for gas to carry out arbitrages
     */
    function addGas() external payable {
        require(msg.value > 0, "ZERO_AMOUNT_SENT!");
        emit GasAdded(msg.sender, msg.value);
    }


    /**
     * @dev function to withdraw avax from contract
     */
    function withdraw() onlyDeployer external {
        payable(msg.sender).transfer(address(this).balance);
        emit Withdraw(msg.sender, address(this).balance);
    }


    /**
     * @dev check the amout of AVAX left in contract
     */
    function checkGas() external view returns(uint256) {
        return address(this).balance;
    }

}