// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PostQuantumToken.sol";

contract DeployPostQuantumToken is Script {
    function run() external returns (PostQuantumToken token) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        string memory name = vm.envOr("TOKEN_NAME", string("Post Quantum Demo"));
        string memory symbol = vm.envOr("TOKEN_SYMBOL", string("PQD"));
        uint256 initialSupply = vm.envOr("TOKEN_INITIAL_SUPPLY", uint256(1_000_000 ether));

        vm.startBroadcast(deployerPrivateKey);
        token = new PostQuantumToken(name, symbol, initialSupply, deployer);
        vm.stopBroadcast();
    }
}
