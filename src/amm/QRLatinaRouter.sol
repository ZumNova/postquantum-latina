// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QRLatinaFactory.sol";
import "./QRLatinaPair.sol";
import "./QRLatinaWQRL.sol";

interface IRouterERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract QRLatinaRouter {
    QRLatinaFactory public immutable factory;
    QRLatinaWQRL public immutable wqrl;

    error Expired();
    error InsufficientAmount();
    error InsufficientOutputAmount();
    error PairMissing();
    error InvalidPath();
    error TransferFailed();

    constructor(address factory_, address wqrl_) {
        factory = QRLatinaFactory(factory_);
        wqrl = QRLatinaWQRL(payable(wqrl_));
    }

    receive() external payable {
        require(msg.sender == address(wqrl), "ONLY_WQRL");
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        address pair = _pairForOrCreate(tokenA, tokenB);
        (amountA, amountB) = _quoteAddLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);

        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = QRLatinaPair(pair).mint(to);
    }

    function addLiquidityQRL(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountQRLMin,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256 amountToken, uint256 amountQRL, uint256 liquidity) {
        address pair = _pairForOrCreate(token, address(wqrl));
        (amountToken, amountQRL) =
            _quoteAddLiquidity(token, address(wqrl), amountTokenDesired, msg.value, amountTokenMin, amountQRLMin);

        _safeTransferFrom(token, msg.sender, pair, amountToken);
        wqrl.deposit{value: amountQRL}();
        require(wqrl.transfer(pair, amountQRL), "WQRL_TRANSFER");
        liquidity = QRLatinaPair(pair).mint(to);

        if (msg.value > amountQRL) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - amountQRL}("");
            if (!ok) revert TransferFailed();
        }
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountOut) {
        if (path.length != 2) revert InvalidPath();
        address pair = factory.getPair(path[0], path[1]);
        if (pair == address(0)) revert PairMissing();

        amountOut = getAmountOut(amountIn, path[0], path[1]);
        if (amountOut < amountOutMin) revert InsufficientOutputAmount();

        _safeTransferFrom(path[0], msg.sender, pair, amountIn);
        _swap(pair, path[0], amountOut, to);
    }

    function swapExactQRLForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256 amountOut) {
        if (path.length != 2 || path[0] != address(wqrl)) revert InvalidPath();
        address pair = factory.getPair(path[0], path[1]);
        if (pair == address(0)) revert PairMissing();

        amountOut = getAmountOut(msg.value, path[0], path[1]);
        if (amountOut < amountOutMin) revert InsufficientOutputAmount();

        wqrl.deposit{value: msg.value}();
        require(wqrl.transfer(pair, msg.value), "WQRL_TRANSFER");
        _swap(pair, path[0], amountOut, to);
    }

    function swapExactTokensForQRL(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountOut) {
        if (path.length != 2 || path[1] != address(wqrl)) revert InvalidPath();
        address pair = factory.getPair(path[0], path[1]);
        if (pair == address(0)) revert PairMissing();

        amountOut = getAmountOut(amountIn, path[0], path[1]);
        if (amountOut < amountOutMin) revert InsufficientOutputAmount();

        _safeTransferFrom(path[0], msg.sender, pair, amountIn);
        _swap(pair, path[0], amountOut, address(this));
        wqrl.withdraw(amountOut);

        (bool ok, ) = payable(to).call{value: amountOut}("");
        if (!ok) revert TransferFailed();
    }

    function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) public view returns (uint256 amountOut) {
        if (amountIn == 0) revert InsufficientAmount();
        address pair = factory.getPair(tokenIn, tokenOut);
        if (pair == address(0)) revert PairMissing();

        (uint112 reserve0, uint112 reserve1, ) = QRLatinaPair(pair).getReserves();
        address token0 = QRLatinaPair(pair).token0();
        (uint256 reserveIn, uint256 reserveOut) =
            tokenIn == token0 ? (uint256(reserve0), uint256(reserve1)) : (uint256(reserve1), uint256(reserve0));
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientAmount();

        uint256 amountInWithFee = amountIn * 997;
        amountOut = (amountInWithFee * reserveOut) / ((reserveIn * 1000) + amountInWithFee);
    }

    modifier ensure(uint256 deadline) {
        if (deadline < block.timestamp) revert Expired();
        _;
    }

    function _quoteAddLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) private view returns (uint256 amountA, uint256 amountB) {
        address pair = factory.getPair(tokenA, tokenB);
        (uint112 reserve0, uint112 reserve1, ) = QRLatinaPair(pair).getReserves();
        address token0 = QRLatinaPair(pair).token0();
        (uint256 reserveA, uint256 reserveB) =
            tokenA == token0 ? (uint256(reserve0), uint256(reserve1)) : (uint256(reserve1), uint256(reserve0));

        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint256 amountBOptimal = _quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                if (amountBOptimal < amountBMin) revert InsufficientAmount();
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = _quote(amountBDesired, reserveB, reserveA);
                if (amountAOptimal < amountAMin) revert InsufficientAmount();
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }
    }

    function _quote(uint256 amountA, uint256 reserveA, uint256 reserveB) private pure returns (uint256) {
        if (amountA == 0 || reserveA == 0 || reserveB == 0) revert InsufficientAmount();
        return (amountA * reserveB) / reserveA;
    }

    function _pairForOrCreate(address tokenA, address tokenB) private returns (address pair) {
        pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = factory.createPair(tokenA, tokenB);
        }
    }

    function _swap(address pair, address tokenIn, uint256 amountOut, address to) private {
        address token0 = QRLatinaPair(pair).token0();
        (uint256 amount0Out, uint256 amount1Out) = tokenIn == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
        QRLatinaPair(pair).swap(amount0Out, amount1Out, to);
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        bool ok = IRouterERC20(token).transferFrom(from, to, amount);
        if (!ok) revert TransferFailed();
    }
}
