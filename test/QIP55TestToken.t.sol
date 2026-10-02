// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/QIP55TestToken.sol";

contract QIP55TestTokenTest is Test {
    QIP55TestToken internal token;

    function setUp() public {
        token = new QIP55TestToken("QRLatina Test Token", "QRLATX", 1_000_000 ether);
    }

    function test_InitialSupplyBelongsToDeployer() public view {
        assertEq(token.owner(), address(this));
        assertEq(token.balanceOf(address(this)), 1_000_000 ether);
        assertEq(token.totalSupply(), 1_000_000 ether);
        assertEq(token.symbol(), "QRLATX");
    }
}
