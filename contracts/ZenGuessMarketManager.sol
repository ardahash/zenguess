// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ZenGuessMarketManager is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant PRICE_SCALE = 1e18;
    uint8 public constant MIN_OUTCOMES = 2;
    uint8 public constant MAX_OUTCOMES = 8;
    uint64 public constant MIN_MARKET_DURATION = 5 minutes;

    enum TradeSide {
        Buy,
        Sell
    }

    struct MarketCore {
        string question;
        string resolutionSource;
        address creator;
        uint64 createdAt;
        uint64 endTime;
        uint64 resolvedAt;
        uint8 outcomeCount;
        uint8 winningOutcome;
        bool resolved;
        uint256 totalCollateral;
        uint256 totalClaimed;
    }

    struct MarketView {
        uint256 marketId;
        string question;
        string resolutionSource;
        address creator;
        uint64 createdAt;
        uint64 endTime;
        uint64 resolvedAt;
        uint8 outcomeCount;
        uint8 winningOutcome;
        bool resolved;
        uint256 totalCollateral;
        uint256 totalClaimed;
    }

    struct TradeQuote {
        uint256 estimatedAmount;
        uint256 fee;
        uint256 executionPrice;
    }

    error InvalidAddress();
    error InvalidAmount();
    error InvalidOutcome();
    error InvalidMarket();
    error InvalidMarketState();
    error InvalidFeeBps();
    error InvalidDuration();
    error InsufficientOutput();
    error InsufficientLiquidity();
    error DeadlineExpired();
    error AlreadyClaimed();
    error NothingToClaim();

    event ResolverUpdated(address indexed previousResolver, address indexed nextResolver);
    event TradingFeeUpdated(uint16 previousTradingFeeBps, uint16 nextTradingFeeBps);
    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        uint64 endTime,
        uint8 outcomeCount,
        uint256 initialLiquidity
    );
    event TradeExecuted(
        uint256 indexed marketId,
        address indexed trader,
        uint8 indexed outcomeIndex,
        TradeSide side,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 fee
    );
    event MarketResolved(
        uint256 indexed marketId,
        uint8 indexed winningOutcome,
        uint64 resolvedAt
    );
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed account,
        uint256 payout
    );
    event ProtocolFeesCollected(address indexed to, uint256 amount);
    event EmergencyPause(address indexed account);
    event EmergencyUnpause(address indexed account);

    IERC20 public immutable collateralToken;
    address public resolver;
    uint16 public tradingFeeBps;
    uint256 public protocolFeesAccrued;

    uint256 private _nextMarketId = 1;
    uint256[] private _marketIds;

    mapping(uint256 marketId => MarketCore core) private _markets;
    mapping(uint256 marketId => string[] outcomes) private _marketOutcomes;
    mapping(uint256 marketId => mapping(uint8 outcome => uint256 liquidity))
        private _outcomeLiquidity;
    mapping(uint256 marketId => mapping(uint8 outcome => uint256 shares))
        private _outcomeShares;
    mapping(uint256 marketId => mapping(address account => mapping(uint8 outcome => uint256 shares)))
        private _userOutcomeShares;
    mapping(uint256 marketId => mapping(address account => bool claimed))
        private _hasClaimedWinnings;

    constructor(
        address initialOwner,
        address collateralTokenAddress,
        address initialResolver,
        uint16 initialTradingFeeBps
    ) Ownable(initialOwner) {
        if (collateralTokenAddress == address(0) || initialResolver == address(0)) {
            revert InvalidAddress();
        }
        if (initialTradingFeeBps >= BPS_DENOMINATOR) {
            revert InvalidFeeBps();
        }

        collateralToken = IERC20(collateralTokenAddress);
        resolver = initialResolver;
        tradingFeeBps = initialTradingFeeBps;
    }

    modifier onlyResolverOrOwner() {
        if (msg.sender != resolver && msg.sender != owner()) {
            revert InvalidAddress();
        }
        _;
    }

    function marketCount() external view returns (uint256) {
        return _marketIds.length;
    }

    function getMarketIds() external view returns (uint256[] memory ids) {
        return _marketIds;
    }

    function getMarket(uint256 marketId) external view returns (MarketView memory) {
        MarketCore storage market = _getExistingMarket(marketId);
        return _toMarketView(marketId, market);
    }

    function listMarkets(
        uint256 cursor,
        uint256 size
    ) external view returns (MarketView[] memory items, uint256 nextCursor) {
        if (cursor >= _marketIds.length) {
            return (new MarketView[](0), cursor);
        }

        uint256 remaining = _marketIds.length - cursor;
        uint256 pageSize = remaining < size ? remaining : size;
        items = new MarketView[](pageSize);

        for (uint256 i = 0; i < pageSize; i++) {
            uint256 marketId = _marketIds[cursor + i];
            items[i] = _toMarketView(marketId, _markets[marketId]);
        }

        nextCursor = cursor + pageSize;
    }

    function getMarketOutcomes(
        uint256 marketId
    ) external view returns (string[] memory outcomes) {
        _getExistingMarket(marketId);
        return _marketOutcomes[marketId];
    }

    function getUserShares(
        uint256 marketId,
        address account,
        uint8 outcomeIndex
    ) external view returns (uint256) {
        _assertValidOutcome(marketId, outcomeIndex);
        return _userOutcomeShares[marketId][account][outcomeIndex];
    }

    function getOutcomeLiquidity(
        uint256 marketId,
        uint8 outcomeIndex
    ) external view returns (uint256) {
        _assertValidOutcome(marketId, outcomeIndex);
        return _outcomeLiquidity[marketId][outcomeIndex];
    }

    function getOutcomeShares(
        uint256 marketId,
        uint8 outcomeIndex
    ) external view returns (uint256) {
        _assertValidOutcome(marketId, outcomeIndex);
        return _outcomeShares[marketId][outcomeIndex];
    }

    function isMarketOpen(uint256 marketId) external view returns (bool) {
        MarketCore storage market = _getExistingMarket(marketId);
        return _isMarketOpen(market);
    }

    function createMarket(
        string calldata question,
        string calldata resolutionSource,
        uint64 endTime,
        string[] calldata outcomes,
        uint256 initialLiquidity
    ) external whenNotPaused returns (uint256 marketId) {
        if (bytes(question).length == 0 || bytes(resolutionSource).length == 0) {
            revert InvalidMarket();
        }
        if (
            outcomes.length < MIN_OUTCOMES || outcomes.length > MAX_OUTCOMES
        ) {
            revert InvalidOutcome();
        }
        if (initialLiquidity == 0) {
            revert InvalidAmount();
        }
        if (endTime <= block.timestamp || endTime - block.timestamp < MIN_MARKET_DURATION) {
            revert InvalidDuration();
        }

        for (uint256 i = 0; i < outcomes.length; i++) {
            if (bytes(outcomes[i]).length == 0) {
                revert InvalidOutcome();
            }
        }

        marketId = _nextMarketId++;
        uint8 outcomeCount = uint8(outcomes.length);
        MarketCore storage market = _markets[marketId];
        market.question = question;
        market.resolutionSource = resolutionSource;
        market.creator = msg.sender;
        market.createdAt = uint64(block.timestamp);
        market.endTime = endTime;
        market.outcomeCount = outcomeCount;
        market.totalCollateral = initialLiquidity;

        _marketOutcomes[marketId] = outcomes;
        _marketIds.push(marketId);

        collateralToken.safeTransferFrom(msg.sender, address(this), initialLiquidity);

        uint256 perOutcomeLiquidity = initialLiquidity / outcomeCount;
        uint256 remainder = initialLiquidity - (perOutcomeLiquidity * outcomeCount);
        uint256 initialPrice = PRICE_SCALE / outcomeCount;

        for (uint8 i = 0; i < outcomeCount; i++) {
            uint256 liquidity = perOutcomeLiquidity;
            if (i == 0 && remainder > 0) {
                liquidity += remainder;
            }

            _outcomeLiquidity[marketId][i] = liquidity;

            // Bootstrap creator inventory so at least one account holds shares on every outcome.
            uint256 mintedShares = (liquidity * PRICE_SCALE) / initialPrice;
            _outcomeShares[marketId][i] = mintedShares;
            _userOutcomeShares[marketId][msg.sender][i] = mintedShares;
        }

        emit MarketCreated(
            marketId,
            msg.sender,
            endTime,
            outcomeCount,
            initialLiquidity
        );
    }

    function simulateTrade(
        uint256 marketId,
        uint8 outcomeIndex,
        uint256 amount,
        TradeSide side
    ) public view returns (TradeQuote memory quote) {
        if (amount == 0) {
            revert InvalidAmount();
        }
        MarketCore storage market = _getExistingMarket(marketId);
        _assertValidOutcome(marketId, outcomeIndex);
        uint256 executionPrice = _currentOutcomePrice(market, marketId, outcomeIndex);

        if (side == TradeSide.Buy) {
            uint256 fee = _calculateFee(amount);
            uint256 netCollateral = amount - fee;
            uint256 estimatedShares = (netCollateral * PRICE_SCALE) / executionPrice;

            quote = TradeQuote({
                estimatedAmount: estimatedShares,
                fee: fee,
                executionPrice: executionPrice
            });
        } else {
            uint256 grossCollateral = (amount * executionPrice) / PRICE_SCALE;
            uint256 fee = _calculateFee(grossCollateral);
            uint256 estimatedCollateralOut = grossCollateral - fee;

            quote = TradeQuote({
                estimatedAmount: estimatedCollateralOut,
                fee: fee,
                executionPrice: executionPrice
            });
        }
    }

    function buyShares(
        uint256 marketId,
        uint8 outcomeIndex,
        uint256 collateralIn,
        uint256 minSharesOut,
        uint64 deadline
    ) external whenNotPaused nonReentrant returns (uint256 sharesOut) {
        if (deadline < block.timestamp) {
            revert DeadlineExpired();
        }
        if (collateralIn == 0) {
            revert InvalidAmount();
        }

        MarketCore storage market = _getExistingMarket(marketId);
        if (!_isMarketOpen(market)) {
            revert InvalidMarketState();
        }

        TradeQuote memory quote = simulateTrade(
            marketId,
            outcomeIndex,
            collateralIn,
            TradeSide.Buy
        );
        sharesOut = quote.estimatedAmount;

        if (sharesOut < minSharesOut) {
            revert InsufficientOutput();
        }

        collateralToken.safeTransferFrom(msg.sender, address(this), collateralIn);

        uint256 netCollateral = collateralIn - quote.fee;
        protocolFeesAccrued += quote.fee;

        _outcomeLiquidity[marketId][outcomeIndex] += netCollateral;
        _outcomeShares[marketId][outcomeIndex] += sharesOut;
        _userOutcomeShares[marketId][msg.sender][outcomeIndex] += sharesOut;
        market.totalCollateral += netCollateral;

        emit TradeExecuted(
            marketId,
            msg.sender,
            outcomeIndex,
            TradeSide.Buy,
            collateralIn,
            sharesOut,
            quote.fee
        );
    }

    function sellShares(
        uint256 marketId,
        uint8 outcomeIndex,
        uint256 sharesIn,
        uint256 minCollateralOut,
        uint64 deadline
    ) external whenNotPaused nonReentrant returns (uint256 collateralOut) {
        if (deadline < block.timestamp) {
            revert DeadlineExpired();
        }
        if (sharesIn == 0) {
            revert InvalidAmount();
        }

        MarketCore storage market = _getExistingMarket(marketId);
        if (!_isMarketOpen(market)) {
            revert InvalidMarketState();
        }
        _assertValidOutcome(marketId, outcomeIndex);

        uint256 userShares = _userOutcomeShares[marketId][msg.sender][outcomeIndex];
        if (sharesIn > userShares) {
            revert InsufficientOutput();
        }

        TradeQuote memory quote = simulateTrade(
            marketId,
            outcomeIndex,
            sharesIn,
            TradeSide.Sell
        );
        collateralOut = quote.estimatedAmount;
        if (collateralOut < minCollateralOut) {
            revert InsufficientOutput();
        }

        uint256 grossCollateral = (sharesIn * quote.executionPrice) / PRICE_SCALE;
        if (_outcomeLiquidity[marketId][outcomeIndex] < grossCollateral) {
            revert InsufficientLiquidity();
        }
        if (market.totalCollateral < grossCollateral) {
            revert InsufficientLiquidity();
        }

        _userOutcomeShares[marketId][msg.sender][outcomeIndex] = userShares - sharesIn;
        _outcomeShares[marketId][outcomeIndex] -= sharesIn;
        _outcomeLiquidity[marketId][outcomeIndex] -= grossCollateral;
        market.totalCollateral -= grossCollateral;

        protocolFeesAccrued += quote.fee;
        collateralToken.safeTransfer(msg.sender, collateralOut);

        emit TradeExecuted(
            marketId,
            msg.sender,
            outcomeIndex,
            TradeSide.Sell,
            sharesIn,
            collateralOut,
            quote.fee
        );
    }

    function resolveMarket(
        uint256 marketId,
        uint8 winningOutcome
    ) external onlyResolverOrOwner {
        MarketCore storage market = _getExistingMarket(marketId);
        if (market.resolved) {
            revert InvalidMarketState();
        }
        if (block.timestamp < market.endTime) {
            revert InvalidMarketState();
        }
        _assertValidOutcome(marketId, winningOutcome);

        market.resolved = true;
        market.winningOutcome = winningOutcome;
        market.resolvedAt = uint64(block.timestamp);

        emit MarketResolved(marketId, winningOutcome, market.resolvedAt);
    }

    function claimWinnings(
        uint256 marketId
    ) external nonReentrant returns (uint256 payout) {
        MarketCore storage market = _getExistingMarket(marketId);
        if (!market.resolved) {
            revert InvalidMarketState();
        }
        if (_hasClaimedWinnings[marketId][msg.sender]) {
            revert AlreadyClaimed();
        }

        uint8 winningOutcome = market.winningOutcome;
        uint256 winningShares = _userOutcomeShares[marketId][msg.sender][winningOutcome];
        if (winningShares == 0) {
            revert NothingToClaim();
        }

        uint256 totalWinningShares = _outcomeShares[marketId][winningOutcome];
        payout = (winningShares * market.totalCollateral) / totalWinningShares;
        if (payout == 0) {
            revert NothingToClaim();
        }

        _hasClaimedWinnings[marketId][msg.sender] = true;
        _userOutcomeShares[marketId][msg.sender][winningOutcome] = 0;
        market.totalClaimed += payout;

        collateralToken.safeTransfer(msg.sender, payout);
        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    function setResolver(address nextResolver) external onlyOwner {
        if (nextResolver == address(0)) {
            revert InvalidAddress();
        }
        address previousResolver = resolver;
        resolver = nextResolver;
        emit ResolverUpdated(previousResolver, nextResolver);
    }

    function setTradingFeeBps(uint16 nextTradingFeeBps) external onlyOwner {
        if (nextTradingFeeBps >= BPS_DENOMINATOR) {
            revert InvalidFeeBps();
        }
        uint16 previousTradingFeeBps = tradingFeeBps;
        tradingFeeBps = nextTradingFeeBps;
        emit TradingFeeUpdated(previousTradingFeeBps, nextTradingFeeBps);
    }

    function collectProtocolFees(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) {
            revert InvalidAddress();
        }
        if (amount == 0 || amount > protocolFeesAccrued) {
            revert InvalidAmount();
        }

        protocolFeesAccrued -= amount;
        collateralToken.safeTransfer(to, amount);
        emit ProtocolFeesCollected(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
        emit EmergencyPause(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }

    function _isMarketOpen(MarketCore storage market) internal view returns (bool) {
        return !market.resolved && block.timestamp < market.endTime;
    }

    function _calculateFee(uint256 amount) internal view returns (uint256) {
        return (amount * tradingFeeBps) / BPS_DENOMINATOR;
    }

    function _currentOutcomePrice(
        MarketCore storage market,
        uint256 marketId,
        uint8 outcomeIndex
    ) internal view returns (uint256) {
        uint256 marketLiquidity = market.totalCollateral;
        if (marketLiquidity == 0) {
            revert InsufficientLiquidity();
        }

        uint256 liquidity = _outcomeLiquidity[marketId][outcomeIndex];
        if (liquidity == 0) {
            revert InsufficientLiquidity();
        }

        return (liquidity * PRICE_SCALE) / marketLiquidity;
    }

    function _toMarketView(
        uint256 marketId,
        MarketCore storage market
    ) internal view returns (MarketView memory) {
        return
            MarketView({
                marketId: marketId,
                question: market.question,
                resolutionSource: market.resolutionSource,
                creator: market.creator,
                createdAt: market.createdAt,
                endTime: market.endTime,
                resolvedAt: market.resolvedAt,
                outcomeCount: market.outcomeCount,
                winningOutcome: market.winningOutcome,
                resolved: market.resolved,
                totalCollateral: market.totalCollateral,
                totalClaimed: market.totalClaimed
            });
    }

    function _getExistingMarket(
        uint256 marketId
    ) internal view returns (MarketCore storage market) {
        market = _markets[marketId];
        if (market.createdAt == 0) {
            revert InvalidMarket();
        }
    }

    function _assertValidOutcome(uint256 marketId, uint8 outcomeIndex) internal view {
        MarketCore storage market = _getExistingMarket(marketId);
        if (outcomeIndex >= market.outcomeCount) {
            revert InvalidOutcome();
        }
    }
}
