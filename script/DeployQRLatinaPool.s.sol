// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/QRLatinaPool.sol";

contract DeployQRLatinaPool is Script {
    function run() external returns (QRLatinaPool pool) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envOr("POOL_OWNER", vm.addr(deployerPrivateKey));
        address stakingToken = vm.envAddress("POOL_STAKING_TOKEN");
        address rewardToken = vm.envAddress("POOL_REWARD_TOKEN");

        vm.startBroadcast(deployerPrivateKey);
        pool = new QRLatinaPool(stakingToken, rewardToken, owner);
        vm.stopBroadcast();
    }
}
