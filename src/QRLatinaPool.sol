// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IQRLatinaERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title QRLatinaPool
 * @notice Pool de staking QRC20/ERC20 para pruebas en QRL/Zond testnet.
 * @dev Modelo simple: los usuarios depositan `stakingToken` y el owner carga rewards en `rewardToken`.
 */
contract QRLatinaPool {
    uint256 private constant ACC_PRECISION = 1e18;

    IQRLatinaERC20 public immutable stakingToken;
    IQRLatinaERC20 public immutable rewardToken;
    address public owner;

    uint256 public totalStaked;
    uint256 public accRewardPerShare;
    uint256 public undistributedRewards;

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public rewardDebt;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsFunded(address indexed funder, uint256 amount, uint256 distributedAmount);
    event RewardsClaimed(address indexed user, uint256 amount);

    error NotOwner();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientStake();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address stakingToken_, address rewardToken_, address owner_) {
        if (stakingToken_ == address(0) || rewardToken_ == address(0) || owner_ == address(0)) revert ZeroAddress();

        stakingToken = IQRLatinaERC20(stakingToken_);
        rewardToken = IQRLatinaERC20(rewardToken_);
        owner = owner_;

        emit OwnershipTransferred(address(0), owner_);
    }

    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        _claim(msg.sender);
        _safeTransferFrom(stakingToken, msg.sender, address(this), amount);

        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        rewardDebt[msg.sender] = _rewardDebt(stakedBalance[msg.sender]);

        if (undistributedRewards > 0) {
            _distribute(undistributedRewards);
            undistributedRewards = 0;
        }

        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (stakedBalance[msg.sender] < amount) revert InsufficientStake();

        _claim(msg.sender);

        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        rewardDebt[msg.sender] = _rewardDebt(stakedBalance[msg.sender]);

        _safeTransfer(stakingToken, msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function claim() external {
        _claim(msg.sender);
        rewardDebt[msg.sender] = _rewardDebt(stakedBalance[msg.sender]);
    }

    function fundRewards(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        _safeTransferFrom(rewardToken, msg.sender, address(this), amount);

        uint256 distributedAmount;
        if (totalStaked == 0) {
            undistributedRewards += amount;
        } else {
            _distribute(amount);
            distributedAmount = amount;
        }

        emit RewardsFunded(msg.sender, amount, distributedAmount);
    }

    function pendingRewards(address account) public view returns (uint256) {
        uint256 accumulated = (stakedBalance[account] * accRewardPerShare) / ACC_PRECISION;
        if (accumulated <= rewardDebt[account]) {
            return 0;
        }
        return accumulated - rewardDebt[account];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _claim(address account) private {
        uint256 pending = pendingRewards(account);
        if (pending == 0) {
            return;
        }

        _safeTransfer(rewardToken, account, pending);
        emit RewardsClaimed(account, pending);
    }

    function _distribute(uint256 amount) private {
        accRewardPerShare += (amount * ACC_PRECISION) / totalStaked;
    }

    function _rewardDebt(uint256 amount) private view returns (uint256) {
        return (amount * accRewardPerShare) / ACC_PRECISION;
    }

    function _safeTransfer(IQRLatinaERC20 token, address to, uint256 amount) private {
        bool ok = token.transfer(to, amount);
        if (!ok) revert TransferFailed();
    }

    function _safeTransferFrom(IQRLatinaERC20 token, address from, address to, uint256 amount) private {
        bool ok = token.transferFrom(from, to, amount);
        if (!ok) revert TransferFailed();
    }
}
