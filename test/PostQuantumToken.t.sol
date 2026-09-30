// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PostQuantumToken.sol";

contract PostQuantumTokenTest is Test {
    PostQuantumToken public token;
    address public owner = address(0xA11CE);
    address public user = address(0xB0B);
    address public spender = address(0xCAFE);

    function setUp() public {
        token = new PostQuantumToken("Post Quantum Demo", "PQD", 1_000_000 ether, owner);
    }

    function test_InitialSupplyBelongsToOwner() public view {
        assertEq(token.name(), "Post Quantum Demo");
        assertEq(token.symbol(), "PQD");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 1_000_000 ether);
        assertEq(token.balanceOf(owner), 1_000_000 ether);
    }

    function test_Transfer() public {
        vm.prank(owner);
        token.transfer(user, 100 ether);

        assertEq(token.balanceOf(owner), 999_900 ether);
        assertEq(token.balanceOf(user), 100 ether);
    }

    function test_ApproveAndTransferFrom() public {
        vm.prank(owner);
        token.approve(spender, 50 ether);

        vm.prank(spender);
        token.transferFrom(owner, user, 20 ether);

        assertEq(token.allowance(owner, spender), 30 ether);
        assertEq(token.balanceOf(user), 20 ether);
    }

    function test_OnlyOwnerCanMint() public {
        vm.prank(user);
        vm.expectRevert(PostQuantumToken.NotOwner.selector);
        token.mint(user, 1 ether);

        vm.prank(owner);
        token.mint(user, 1 ether);

        assertEq(token.balanceOf(user), 1 ether);
    }
}
