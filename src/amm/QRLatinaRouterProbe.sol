// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProbeERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract QRLatinaRouterProbe {
    address public immutable owner;

    event TokenPulled(address indexed token, address indexed from, address indexed to, uint256 amount);
    event TokenRescued(address indexed token, address indexed to, uint256 amount);
    event NativeRescued(address indexed to, uint256 amount);

    error NotOwner();
    error ZeroAddress();
    error TransferFailed();
    error NoValue();

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    function pullToken(address token, address from, uint256 amount) external returns (bool) {
        if (token == address(0) || from == address(0)) revert ZeroAddress();
        if (!IProbeERC20(token).transferFrom(from, address(this), amount)) revert TransferFailed();

        emit TokenPulled(token, from, address(this), amount);
        return true;
    }

    function pullTokenTo(address token, address from, address to, uint256 amount) external returns (bool) {
        if (token == address(0) || from == address(0) || to == address(0)) revert ZeroAddress();
        if (!IProbeERC20(token).transferFrom(from, to, amount)) revert TransferFailed();

        emit TokenPulled(token, from, to, amount);
        return true;
    }

    function tokenBalance(address token) external view returns (uint256) {
        if (token == address(0)) revert ZeroAddress();
        return IProbeERC20(token).balanceOf(address(this));
    }

    function rescueToken(address token, address to, uint256 amount) external onlyOwner returns (bool) {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (!IProbeERC20(token).transfer(to, amount)) revert TransferFailed();

        emit TokenRescued(token, to, amount);
        return true;
    }

    function rescueNative(address payable to, uint256 amount) external onlyOwner returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert NoValue();

        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit NativeRescued(to, amount);
        return true;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
}
