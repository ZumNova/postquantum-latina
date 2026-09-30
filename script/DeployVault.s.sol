// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VaultQRL.sol";

/**
 * @title Script de Despliegue para VaultQRL
 * @dev Parsea la clave privada desde el entorno como bytes32 para evitar errores de tipo.
 */
contract DeployVault is Script {
    function run() external returns (VaultQRL) {
        // Lee la variable PRIVATE_KEY como bytes32 y la convierte a uint256
        uint256 deployerPrivateKey = uint256(vm.envBytes32("PRIVATE_KEY"));

        // Inicia la transmisión de la transacción
        vm.startBroadcast(deployerPrivateKey);

        // Instancia y despliega el contrato en la blockchain local
        VaultQRL vault = new VaultQRL();

        // Finaliza el registro de la transacción
        vm.stopBroadcast();

        return vault;
    }
}