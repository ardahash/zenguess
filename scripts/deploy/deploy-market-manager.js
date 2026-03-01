/* eslint-disable no-console */
const fs = require("node:fs")
const path = require("node:path")
const hre = require("hardhat")

function envNumber(name, fallback) {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be numeric.`)
  }
  return parsed
}

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  const network = await hre.ethers.provider.getNetwork()
  const deployerAddress = await deployer.getAddress()

  const ownerAddress = process.env.DEPLOY_OWNER_ADDRESS || deployerAddress
  const resolverAddress = process.env.RESOLVER_ADDRESS || deployerAddress
  const tradingFeeBps = envNumber("TRADING_FEE_BPS", 200)

  if (tradingFeeBps < 0 || tradingFeeBps >= 10_000) {
    throw new Error("TRADING_FEE_BPS must be between 0 and 9999.")
  }

  let collateralAddress = process.env.COLLATERAL_TOKEN_ADDRESS

  if (!collateralAddress) {
    const MockCollateral = await hre.ethers.getContractFactory("MockCollateral")
    const mockCollateral = await MockCollateral.deploy("Mock USD", "mUSD", 18)
    await mockCollateral.waitForDeployment()
    collateralAddress = await mockCollateral.getAddress()
    console.log(`Deployed MockCollateral at: ${collateralAddress}`)
  }

  const MarketManager = await hre.ethers.getContractFactory(
    "ZenGuessMarketManager"
  )
  const manager = await MarketManager.deploy(
    ownerAddress,
    collateralAddress,
    resolverAddress,
    tradingFeeBps
  )
  await manager.waitForDeployment()
  const managerAddress = await manager.getAddress()

  const output = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    owner: ownerAddress,
    resolver: resolverAddress,
    tradingFeeBps,
    contracts: {
      collateralToken: collateralAddress,
      marketManager: managerAddress,
    },
  }

  const deploymentDir = path.join(process.cwd(), "deployments")
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true })
  }
  const deploymentFile = path.join(deploymentDir, `${hre.network.name}.json`)
  fs.writeFileSync(deploymentFile, JSON.stringify(output, null, 2))

  console.log(`Deployed ZenGuessMarketManager at: ${managerAddress}`)
  console.log(`Deployment record written to: ${deploymentFile}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
