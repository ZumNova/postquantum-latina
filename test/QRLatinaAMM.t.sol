// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PostQuantumToken.sol";
import "../src/amm/QRLatinaFactory.sol";
import "../src/amm/QRLatinaAmmLens.sol";
import "../src/amm/QRLatinaRouter.sol";
import "../src/amm/QRLatinaWQRL.sol";

contract QRLatinaAMMTest is Test {
    PostQuantumToken public qrlat;
    PostQuantumToken public qeth;
    QRLatinaWQRL public wqrl;
    QRLatinaFactory public factory;
    QRLatinaAmmLens public lens;
    QRLatinaRouter public router;

    address public owner = address(0xA11CE);
    address public user = address(0xB0B);

    function setUp() public {
        qrlat = new PostQuantumToken("QRLatina", "QRLAT", 1_000_000 ether, owner);
        qeth = new PostQuantumToken("ETHQRL", "QETH", 1_000_000 ether, owner);
        wqrl = new QRLatinaWQRL();
        factory = new QRLatinaFactory();
        lens = new QRLatinaAmmLens();
        router = new QRLatinaRouter(address(factory), address(wqrl));

        vm.startPrank(owner);
        qrlat.transfer(user, 10_000 ether);
        qeth.transfer(user, 10_000 ether);
        vm.stopPrank();

        vm.deal(user, 100 ether);
    }

    function test_CreatePairAndAddLiquidity() public {
        vm.startPrank(user);
        qrlat.approve(address(router), 1_000 ether);
        qeth.approve(address(router), 1_000 ether);
        router.addLiquidity(
            address(qrlat),
            address(qeth),
            1_000 ether,
            1_000 ether,
            1_000 ether,
            1_000 ether,
            user,
            block.timestamp
        );
        vm.stopPrank();

        address pair = factory.getPair(address(qrlat), address(qeth));
        assertTrue(pair != address(0));
        assertGt(QRLatinaPair(pair).balanceOf(user), 0);
    }

    function test_SwapExactTokensForTokens() public {
        _seedQrlatQethPool();

        uint256 beforeQeth = qeth.balanceOf(user);
        address[] memory path = new address[](2);
        path[0] = address(qrlat);
        path[1] = address(qeth);

        vm.startPrank(user);
        qrlat.approve(address(router), 10 ether);
        uint256 amountOut = router.swapExactTokensForTokens(10 ether, 1, path, user, block.timestamp);
        vm.stopPrank();

        assertEq(qeth.balanceOf(user), beforeQeth + amountOut);
        assertGt(amountOut, 0);
    }

    function test_LensReadsLockedValueAndFirstSwapQuote() public {
        _seedQrlatQethPool();

        QRLatinaAmmLens.PairSnapshot memory data = lens.snapshot(address(factory), address(qrlat), address(qeth));
        assertEq(data.pair, factory.getPair(address(qrlat), address(qeth)));
        assertEq(uint256(data.reserve0) + uint256(data.reserve1), 2_000 ether);
        assertEq(data.token0PriceInToken1, 1 ether);
        assertEq(data.token1PriceInToken0, 1 ether);

        uint256 quote = lens.quoteAmountOut(address(factory), 10 ether, address(qrlat), address(qeth));
        assertEq(quote, router.getAmountOut(10 ether, address(qrlat), address(qeth)));
        assertGt(quote, 0);
        assertLt(quote, 10 ether);
    }

    function test_AddLiquidityWithNativeQRLAndSwap() public {
        vm.startPrank(user);
        qrlat.approve(address(router), 1_000 ether);
        router.addLiquidityQRL{value: 10 ether}(address(qrlat), 1_000 ether, 1_000 ether, 10 ether, user, block.timestamp);

        address[] memory path = new address[](2);
        path[0] = address(wqrl);
        path[1] = address(qrlat);
        uint256 beforeQrlat = qrlat.balanceOf(user);
        uint256 out = router.swapExactQRLForTokens{value: 1 ether}(1, path, user, block.timestamp);
        vm.stopPrank();

        assertEq(qrlat.balanceOf(user), beforeQrlat + out);
        assertGt(out, 0);
    }

    function _seedQrlatQethPool() private {
        vm.startPrank(user);
        qrlat.approve(address(router), 1_000 ether);
        qeth.approve(address(router), 1_000 ether);
        router.addLiquidity(
            address(qrlat),
            address(qeth),
            1_000 ether,
            1_000 ether,
            1_000 ether,
            1_000 ether,
            user,
            block.timestamp
        );
        vm.stopPrank();
    }
}
