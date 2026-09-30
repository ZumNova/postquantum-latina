// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Bóveda de Activos Post-Cuántica (VaultQRL)
 * @dev Contrato compatible con EVM/QRVM para depósito y resguardo de fondos.
 */
contract VaultQRL {
    // Almacena el saldo depositado por cada dirección
    mapping(address => uint256) private _balances;

    // Eventos para auditar la actividad del contrato
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    /**
     * @notice Permite a los usuarios depositar fondos en la bóveda
     */
    function deposit() external payable {
        require(msg.value > 0, "El monto debe ser mayor a cero");
        _balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Permite retirar fondos depositados previamente
     * @param amount Cantidad a retirar
     */
    function withdraw(uint256 amount) external {
        require(_balances[msg.sender] >= amount, "Saldo insuficiente");
        
        _balances[msg.sender] -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Fallo en la transferencia");
        
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Consulta el saldo de un usuario
     * @param account Dirección a consultar
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
}