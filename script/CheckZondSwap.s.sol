// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "../src/interfaces/IZondSwapRouter.sol";
import "../src/interfaces/IZondSwapFactory.sol";

contract CheckZondSwap is Script {
    function run() external view {
        address routerAddress = vm.envAddress("ZONDSWAP_ROUTER");
        address tokenAddress = vm.envAddress("PQD_TOKEN");

        IZondSwapRouter router = IZondSwapRouter(routerAddress);
        address factoryAddress = router.factory();
        address wrappedNative = router.WETH();
        address pair = IZondSwapFactory(factoryAddress).getPair(tokenAddress, wrappedNative);

        console2.log("ZondSwap router:", routerAddress);
        console2.log("ZondSwap factory:", factoryAddress);
        console2.log("Wrapped native:", wrappedNative);
        console2.log("PQD/WZND pair:", pair);
    }
}
