const { expect } = require("chai")
const { ethers } = require("hardhat")
const { time } = require("@nomicfoundation/hardhat-network-helpers")

describe("ZenGuessMarketManager", function () {
  async function deployFixture() {
    const [owner, resolver, trader] = await ethers.getSigners()

    const MockCollateral = await ethers.getContractFactory("MockCollateral")
    const collateral = await MockCollateral.deploy("Mock USD", "mUSD", 18)
    await collateral.waitForDeployment()

    const managerFactory = await ethers.getContractFactory(
      "ZenGuessMarketManager"
    )
    const manager = await managerFactory.deploy(
      owner.address,
      await collateral.getAddress(),
      resolver.address,
      200
    )
    await manager.waitForDeployment()

    const initialMint = ethers.parseEther("1000000")
    await collateral.mint(owner.address, initialMint)
    await collateral.mint(trader.address, initialMint)

    return { owner, resolver, trader, collateral, manager }
  }

  async function createDefaultMarket({ owner, collateral, manager }) {
    const now = await time.latest()
    const endTime = now + 7 * 24 * 60 * 60
    const initialLiquidity = ethers.parseEther("1000")

    await collateral.connect(owner).approve(await manager.getAddress(), initialLiquidity)
    await manager
      .connect(owner)
      .createMarket(
        "Will BTC exceed $200k before 2027?",
        "CoinGecko BTC/USD daily close",
        endTime,
        ["Yes", "No"],
        initialLiquidity
      )

    return { marketId: 1n, endTime, initialLiquidity }
  }

  it("creates a market and stores metadata", async function () {
    const fixture = await deployFixture()
    const { marketId, initialLiquidity } = await createDefaultMarket(fixture)

    const market = await fixture.manager.getMarket(marketId)
    expect(market.question).to.equal("Will BTC exceed $200k before 2027?")
    expect(market.totalCollateral).to.equal(initialLiquidity)
    expect(market.outcomeCount).to.equal(2)
    expect(market.resolved).to.equal(false)
  })

  it("allows buy and sell trades with fee accounting", async function () {
    const fixture = await deployFixture()
    const { marketId } = await createDefaultMarket(fixture)
    const { trader, collateral, manager } = fixture

    const collateralIn = ethers.parseEther("100")
    await collateral.connect(trader).approve(await manager.getAddress(), collateralIn)

    const buyQuote = await manager.simulateTrade(marketId, 0, collateralIn, 0)
    await manager
      .connect(trader)
      .buyShares(
        marketId,
        0,
        collateralIn,
        (buyQuote.estimatedAmount * 99n) / 100n,
        BigInt(Math.floor(Date.now() / 1000) + 3600)
      )

    const sharesBalance = await manager.getUserShares(marketId, trader.address, 0)
    expect(sharesBalance).to.be.gt(0n)

    const sharesToSell = sharesBalance / 2n
    const sellQuote = await manager.simulateTrade(marketId, 0, sharesToSell, 1)

    await manager
      .connect(trader)
      .sellShares(
        marketId,
        0,
        sharesToSell,
        (sellQuote.estimatedAmount * 99n) / 100n,
        BigInt(Math.floor(Date.now() / 1000) + 3600)
      )

    const protocolFees = await manager.protocolFeesAccrued()
    expect(protocolFees).to.be.gt(0n)
  })

  it("resolves a market and lets winning traders claim", async function () {
    const fixture = await deployFixture()
    const { marketId, endTime } = await createDefaultMarket(fixture)
    const { trader, resolver, collateral, manager } = fixture

    const collateralIn = ethers.parseEther("200")
    await collateral.connect(trader).approve(await manager.getAddress(), collateralIn)
    await manager
      .connect(trader)
      .buyShares(
        marketId,
        0,
        collateralIn,
        1,
        BigInt(Math.floor(Date.now() / 1000) + 3600)
      )

    await time.increaseTo(endTime + 1)
    await manager.connect(resolver).resolveMarket(marketId, 0)

    const before = await collateral.balanceOf(trader.address)
    await manager.connect(trader).claimWinnings(marketId)
    const after = await collateral.balanceOf(trader.address)

    expect(after).to.be.gt(before)
  })
})
