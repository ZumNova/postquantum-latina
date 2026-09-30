// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAMMERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title QRLatinaPair
 * @notice Par AMM constant-product minimo con fee de 0.30%.
 */
contract QRLatinaPair {
    uint256 private constant MINIMUM_LIQUIDITY = 1_000;

    string public constant name = "QRLatina LP";
    string public constant symbol = "QRL-LP";
    uint8 public constant decimals = 18;

    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(address indexed sender, uint256 amount0Out, uint256 amount1Out, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);

    error Forbidden();
    error AlreadyInitialized();
    error InsufficientLiquidityMinted();
    error InsufficientLiquidityBurned();
    error InsufficientLiquidity();
    error InsufficientInputAmount();
    error InvalidK();
    error InvalidTo();
    error TransferFailed();

    constructor() {
        factory = msg.sender;
    }

    function initialize(address token0_, address token1_) external {
        if (msg.sender != factory) revert Forbidden();
        if (token0 != address(0) || token1 != address(0)) revert AlreadyInitialized();

        _initializePair(token0_, token1_);
    }

    function _initializePair(address token0_, address token1_) internal {
        if (token0 != address(0) || token1 != address(0)) revert AlreadyInitialized();

        token0 = token0_;
        token1 = token1_;
    }

    function getReserves() public view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "LP_ALLOWANCE");

        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }

        emit Approval(from, msg.sender, allowance[from][msg.sender]);
        _transfer(from, to, amount);
        return true;
    }

    function mint(address to) external returns (uint256 liquidity) {
        (uint112 reserve0_, uint112 reserve1_, ) = getReserves();
        uint256 balance0 = IAMMERC20(token0).balanceOf(address(this));
        uint256 balance1 = IAMMERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - reserve0_;
        uint256 amount1 = balance1 - reserve1_;

        if (totalSupply == 0) {
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            liquidity = _min((amount0 * totalSupply) / reserve0_, (amount1 * totalSupply) / reserve1_);
        }

        if (liquidity == 0) revert InsufficientLiquidityMinted();

        _mint(to, liquidity);
        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    function burn(address to) external returns (uint256 amount0, uint256 amount1) {
        uint256 balance0 = IAMMERC20(token0).balanceOf(address(this));
        uint256 balance1 = IAMMERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf[address(this)];

        amount0 = (liquidity * balance0) / totalSupply;
        amount1 = (liquidity * balance1) / totalSupply;
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidityBurned();

        _burn(address(this), liquidity);
        _safeTransfer(token0, to, amount0);
        _safeTransfer(token1, to, amount1);

        balance0 = IAMMERC20(token0).balanceOf(address(this));
        balance1 = IAMMERC20(token1).balanceOf(address(this));
        _update(balance0, balance1);

        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(uint256 amount0Out, uint256 amount1Out, address to) external {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientInputAmount();
        (uint112 reserve0_, uint112 reserve1_, ) = getReserves();
        if (amount0Out >= reserve0_ || amount1Out >= reserve1_) revert InsufficientLiquidity();
        if (to == token0 || to == token1) revert InvalidTo();

        if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);

        uint256 balance0 = IAMMERC20(token0).balanceOf(address(this));
        uint256 balance1 = IAMMERC20(token1).balanceOf(address(this));
        uint256 amount0In = balance0 > reserve0_ - amount0Out ? balance0 - (reserve0_ - amount0Out) : 0;
        uint256 amount1In = balance1 > reserve1_ - amount1Out ? balance1 - (reserve1_ - amount1Out) : 0;
        if (amount0In == 0 && amount1In == 0) revert InsufficientInputAmount();

        uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
        uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
        if (balance0Adjusted * balance1Adjusted < uint256(reserve0_) * uint256(reserve1_) * 1_000_000) {
            revert InvalidK();
        }

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0Out, amount1Out, to);
    }

    function _update(uint256 balance0, uint256 balance1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "OVERFLOW");
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = uint32(block.timestamp % 2 ** 32);
        emit Sync(reserve0, reserve1);
    }

    function _mint(address to, uint256 amount) private {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) private {
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "LP_ZERO_ADDRESS");
        require(balanceOf[from] >= amount, "LP_BALANCE");

        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        bool ok = IAMMERC20(token).transfer(to, amount);
        if (!ok) revert TransferFailed();
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }
}
