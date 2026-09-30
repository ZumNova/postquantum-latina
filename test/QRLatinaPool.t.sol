// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PostQuantumToken.sol";
import "../src/QRLatinaPool.sol";

contract QRLatinaPoolTest is Test {
    PostQuantumToken public stakingToken;
    PostQuantumToken public rewardToken;
    QRLatinaPool public pool;

    address public owner = address(0xA11CE);
    address public userA = address(0xB0B);
    address public userB = address(0xCAFE);

    function setUp() public {
        stakingToken = new PostQuantumToken("QRLatina", "QRLAT", 1_000_000 ether, owner);
        rewardToken = new PostQuantumToken("ETHQRL", "QETH", 1_000_000 ether, owner);
        pool = new QRLatinaPool(address(stakingToken), address(rewardToken), owner);

        vm.startPrank(owner);
        stakingToken.transfer(userA, 1_000 ether);
        stakingToken.transfer(userB, 1_000 ether);
        rewardToken.transfer(userA, 100 ether);
        vm.stopPrank();
    }

    function test_DepositAndWithdraw() public {
        vm.startPrank(userA);
        stakingToken.approve(address(pool), 100 ether);
        pool.deposit(100 ether);
        pool.withdraw(40 ether);
        vm.stopPrank();

        assertEq(pool.stakedBalance(userA), 60 ether);
        assertEq(pool.totalStaked(), 60 ether);
        assertEq(stakingToken.balanceOf(userA), 940 ether);
    }

    function test_RewardsAreDistributedProRata() public {
        vm.prank(userA);
        stakingToken.approve(address(pool), 100 ether);
        vm.prank(userA);
        pool.deposit(100 ether);

        vm.prank(userB);
        stakingToken.approve(address(pool), 300 ether);
        vm.prank(userB);
        pool.deposit(300 ether);

        vm.startPrank(owner);
        rewardToken.approve(address(pool), 40 ether);
        pool.fundRewards(40 ether);
        vm.stopPrank();

        assertEq(pool.pendingRewards(userA), 10 ether);
        assertEq(pool.pendingRewards(userB), 30 ether);

        vm.prank(userA);
        pool.claim();

        assertEq(rewardToken.balanceOf(userA), 110 ether);
        assertEq(pool.pendingRewards(userA), 0);
    }

    function test_RewardsFundedBeforeDepositsAreDistributedToFirstStakers() public {
        vm.startPrank(owner);
        rewardToken.approve(address(pool), 25 ether);
        pool.fundRewards(25 ether);
        vm.stopPrank();

        assertEq(pool.undistributedRewards(), 25 ether);

        vm.startPrank(userA);
        stakingToken.approve(address(pool), 100 ether);
        pool.deposit(100 ether);
        vm.stopPrank();

        assertEq(pool.undistributedRewards(), 0);
        assertEq(pool.pendingRewards(userA), 25 ether);

        vm.prank(userA);
        pool.withdraw(100 ether);

        assertEq(rewardToken.balanceOf(userA), 125 ether);
    }

    function test_CannotWithdrawMoreThanStaked() public {
        vm.prank(userA);
        vm.expectRevert(QRLatinaPool.InsufficientStake.selector);
        pool.withdraw(1 ether);
    }
}
