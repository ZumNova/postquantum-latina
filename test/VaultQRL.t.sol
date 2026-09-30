// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VaultQRL.sol";

/**
 * @title Pruebas unitarias para VaultQRL
 * @dev Utiliza el framework de pruebas nativo de Foundry.
 */
contract VaultQRLTest is Test {
    VaultQRL public vault;
    address public usuario = address(0x1);

    // Asigna fondos de prueba al usuario simulado antes de cada prueba
    function setUp() public {
        vault = new VaultQRL();
        vm.deal(usuario, 10 ether);
    }

    /**
     * @notice Verifica que un usuario pueda depositar fondos correctamente
     */
    function test_DepositoCorrecto() public {
        vm.prank(usuario);
        vault.deposit{value: 2 ether}();

        assertEq(vault.balanceOf(usuario), 2 ether);
        assertEq(address(vault).balance, 2 ether);
    }

    /**
     * @notice Verifica que un usuario pueda retirar sus fondos depositados
     */
    function test_RetiroCorrecto() public {
        // Primero depositamos
        vm.prank(usuario);
        vault.deposit{value: 3 ether}();

        // Luego retiramos
        vm.prank(usuario);
        vault.withdraw(1 ether);

        assertEq(vault.balanceOf(usuario), 2 ether);
        assertEq(usuario.balance, 8 ether);
    }

    /**
     * @notice Verifica que la transacción falle si se intenta retirar más saldo del disponible
     */
    function test_FalloPorSaldoInsuficiente() public {
        vm.prank(usuario);
        vault.deposit{value: 1 ether}();

        vm.prank(usuario);
        vm.expectRevert("Saldo insuficiente");
        vault.withdraw(2 ether);
    }
}