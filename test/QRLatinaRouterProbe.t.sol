// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PostQuantumToken.sol";
import "../src/amm/QRLatinaRouterProbe.sol";

contract QRLatinaRouterProbeTest is Test {
    PostQuantumToken internal leqrl;
    QRLatinaRouterProbe internal router;

    address internal owner = address(0xA11CE);
    address internal user = address(0xB0B);
    address internal treasury = address(0xCAFE);

    function setUp() public {
        leqrl = new PostQuantumToken("legal", "LEQRL", 10_000_000 ether, owner);

        vm.prank(owner);
        router = new QRLatinaRouterProbe();

        vm.prank(owner);
        leqrl.transfer(user, 1_000 ether);
    }

    function test_PullTokenAfterApprove() public {
        uint256 amount = 1 ether;

        vm.prank(user);
        leqrl.approve(address(router), amount);

        router.pullToken(address(leqrl), user, amount);

        assertEq(leqrl.balanceOf(address(router)), amount);
        assertEq(leqrl.balanceOf(user), 999 ether);
        assertEq(leqrl.allowance(user, address(router)), 0);
    }

    function test_PullTokenToTreasuryAfterApprove() public {
        uint256 amount = 2 ether;

        vm.prank(user);
        leqrl.approve(address(router), amount);

        router.pullTokenTo(address(leqrl), user, treasury, amount);

        assertEq(leqrl.balanceOf(address(router)), 0);
        assertEq(leqrl.balanceOf(treasury), amount);
        assertEq(leqrl.balanceOf(user), 998 ether);
    }

    function test_OwnerCanRescueToken() public {
        uint256 amount = 3 ether;

        vm.prank(user);
        leqrl.approve(address(router), amount);
        router.pullToken(address(leqrl), user, amount);

        vm.prank(owner);
        router.rescueToken(address(leqrl), treasury, amount);

        assertEq(leqrl.balanceOf(address(router)), 0);
        assertEq(leqrl.balanceOf(treasury), amount);
    }

    function test_RevertWhenRescueByNonOwner() public {
        vm.expectRevert(QRLatinaRouterProbe.NotOwner.selector);

        vm.prank(user);
        router.rescueToken(address(leqrl), treasury, 1 ether);
    }
}
