// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QRLatinaPair.sol";

contract QRLatinaPairBootstrapped is QRLatinaPair {
    constructor(address token0_, address token1_) {
        _initializePair(token0_, token1_);
    }
}
