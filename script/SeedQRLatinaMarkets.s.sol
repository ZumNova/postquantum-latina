// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "../src/amm/QRLatinaFactory.sol";
import "../src/amm/QRLatinaRouter.sol";

interface ISeedERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract SeedQRLatinaMarkets is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        QRLatinaRouter router = QRLatinaRouter(payable(vm.envAddress("QRLAT_ROUTER")));
        QRLatinaFactory factory = router.factory();

        address qrlat = vm.envAddress("QRLAT_TOKEN");
        address qeth = vm.envAddress("QETH_TOKEN");

        uint256 qrlatForQeth = vm.envOr("SEED_QRLAT_FOR_QETH", uint256(1_000 ether));
        uint256 qethAmount = vm.envOr("SEED_QETH_AMOUNT", uint256(1_000 ether));
        uint256 qrlatForQrl = vm.envOr("SEED_QRLAT_FOR_QRL", uint256(1_000 ether));
        uint256 qrlAmount = vm.envOr("SEED_QRL_AMOUNT", uint256(10 ether));

        vm.startBroadcast(deployerPrivateKey);

        ISeedERC20(qrlat).approve(address(router), qrlatForQeth + qrlatForQrl);
        ISeedERC20(qeth).approve(address(router), qethAmount);

        router.addLiquidity(qrlat, qeth, qrlatForQeth, qethAmount, 1, 1, msg.sender, block.timestamp + 15 minutes);
        router.addLiquidityQRL{value: qrlAmount}(qrlat, qrlatForQrl, 1, 1, msg.sender, block.timestamp + 15 minutes);

        vm.stopBroadcast();

        console2.log("QRLAT/QETH pair", factory.getPair(qrlat, qeth));
        console2.log("QRLAT/WQRL pair", factory.getPair(qrlat, address(router.wqrl())));
    }
}
