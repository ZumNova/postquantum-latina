// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IManualPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract QRLatinaManualFactory {
    address public owner;
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PairRegistered(address indexed token0, address indexed token1, address pair, uint256 allPairsLength);

    error NotOwner();
    error IdenticalAddresses();
    error ZeroAddress();
    error PairExists();
    error PairMissing();
    error PairTokenMismatch();
    error ManualPairRequired();

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address, address) external pure returns (address) {
        revert ManualPairRequired();
    }

    function registerPair(address tokenA, address tokenB, address pair) external onlyOwner returns (address registeredPair) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0) || pair == address(0)) revert ZeroAddress();
        if (getPair[token0][token1] != address(0)) revert PairExists();
        if (IManualPair(pair).token0() != token0 || IManualPair(pair).token1() != token1) revert PairTokenMismatch();

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairRegistered(token0, token1, pair, allPairs.length);
        return pair;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
}
