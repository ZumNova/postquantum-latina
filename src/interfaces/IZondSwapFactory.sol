// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @notice Interfaz compatible con factories tipo Uniswap V2.
 * @dev Validar contra el contrato real de ZondSwap antes de enviar transacciones.
 */
interface IZondSwapFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}
