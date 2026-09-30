// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QRLatinaFactory.sol";
import "./QRLatinaPair.sol";

contract QRLatinaAmmLens {
    error PairMissing();
    error InsufficientAmount();
    error InsufficientLiquidity();

    struct PairSnapshot {
        address pair;
        address token0;
        address token1;
        uint112 reserve0;
        uint112 reserve1;
        uint256 token0PriceInToken1;
        uint256 token1PriceInToken0;
    }

    function snapshot(address factory, address tokenA, address tokenB) external view returns (PairSnapshot memory data) {
        address pair = QRLatinaFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) revert PairMissing();

        (uint112 reserve0, uint112 reserve1, ) = QRLatinaPair(pair).getReserves();
        if (reserve0 == 0 || reserve1 == 0) revert InsufficientLiquidity();

        data = PairSnapshot({
            pair: pair,
            token0: QRLatinaPair(pair).token0(),
            token1: QRLatinaPair(pair).token1(),
            reserve0: reserve0,
            reserve1: reserve1,
            token0PriceInToken1: (uint256(reserve1) * 1e18) / uint256(reserve0),
            token1PriceInToken0: (uint256(reserve0) * 1e18) / uint256(reserve1)
        });
    }

    function quoteAmountOut(
        address factory,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256 amountOut) {
        if (amountIn == 0) revert InsufficientAmount();

        address pair = QRLatinaFactory(factory).getPair(tokenIn, tokenOut);
        if (pair == address(0)) revert PairMissing();

        (uint112 reserve0, uint112 reserve1, ) = QRLatinaPair(pair).getReserves();
        address token0 = QRLatinaPair(pair).token0();
        (uint256 reserveIn, uint256 reserveOut) =
            tokenIn == token0 ? (uint256(reserve0), uint256(reserve1)) : (uint256(reserve1), uint256(reserve0));

        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        uint256 amountInWithFee = amountIn * 997;
        amountOut = (amountInWithFee * reserveOut) / ((reserveIn * 1000) + amountInWithFee);
    }
}
