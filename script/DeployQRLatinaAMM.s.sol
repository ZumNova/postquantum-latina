// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/amm/QRLatinaFactory.sol";
import "../src/amm/QRLatinaRouter.sol";
import "../src/amm/QRLatinaWQRL.sol";

contract DeployQRLatinaAMM is Script {
    function run() external returns (QRLatinaWQRL wqrl, QRLatinaFactory factory, QRLatinaRouter router) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        wqrl = new QRLatinaWQRL();
        factory = new QRLatinaFactory();
        router = new QRLatinaRouter(address(factory), address(wqrl));
        vm.stopBroadcast();
    }
}
