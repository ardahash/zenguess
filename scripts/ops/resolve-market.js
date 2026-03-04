/* eslint-disable no-console */
const fs = require("node:fs")
const path = require("node:path")
const hre = require("hardhat")

function getArgValue(name) {
  const flag = `--${name}`
  const index = process.argv.indexOf(flag)
  if (index === -1) {
    return undefined
  }
  return process.argv[index + 1]
}

function parseRequiredIntegerArg(name) {
  const raw = getArgValue(name)
  if (!raw) {
    throw new Error(`Missing required argument --${name}`)
  }

  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Argument --${name} must be a non-negative integer.`)
  }
  return parsed
}

function resolveDeploymentFile(networkName, label) {
  const deploymentDir = path.join(process.cwd(), "deployments")
  const fileName = label
    ? `${networkName}-${label}.json`
    : `${networkName}.json`
  return path.join(deploymentDir, fileName)
}

function getManagerAddress(networkName) {
  const explicitAddress = process.env.MARKET_MANAGER_ADDRESS
  if (explicitAddress) {
    return explicitAddress
  }

  const label = getArgValue("deployment-label") || process.env.DEPLOYMENT_LABEL
  const primaryFile = resolveDeploymentFile(networkName, label)
  if (fs.existsSync(primaryFile)) {
    const payload = JSON.parse(fs.readFileSync(primaryFile, "utf8"))
    return payload?.contracts?.marketManager
  }

  const fallbackFile = resolveDeploymentFile(networkName, "")
  if (fs.existsSync(fallbackFile)) {
    const payload = JSON.parse(fs.readFileSync(fallbackFile, "utf8"))
    return payload?.contracts?.marketManager
  }

  throw new Error(
    `Could not resolve market manager address. Set MARKET_MANAGER_ADDRESS or provide deployment file for ${networkName}.`
  )
}

async function main() {
  const marketId = parseRequiredIntegerArg("market-id")
  const winningOutcome = parseRequiredIntegerArg("outcome")
  const managerAddress = getManagerAddress(hre.network.name)

  const [signer] = await hre.ethers.getSigners()
  const signerAddress = await signer.getAddress()
  const block = await hre.ethers.provider.getBlock("latest")
  if (!block) {
    throw new Error("Unable to fetch latest block.")
  }

  const manager = await hre.ethers.getContractAt(
    "ZenGuessMarketManager",
    managerAddress,
    signer
  )
  const market = await manager.getMarket(marketId)

  if (market.resolved) {
    throw new Error(`Market ${marketId} is already resolved.`)
  }
  if (winningOutcome >= Number(market.outcomeCount)) {
    throw new Error(
      `Winning outcome ${winningOutcome} is out of range for market ${marketId}.`
    )
  }
  if (Number(market.endTime) > block.timestamp) {
    throw new Error(
      `Market ${marketId} is still open until ${new Date(
        Number(market.endTime) * 1000
      ).toISOString()}.`
    )
  }

  console.log(`Network: ${hre.network.name}`)
  console.log(`Manager: ${managerAddress}`)
  console.log(`Signer: ${signerAddress}`)
  console.log(`Resolving market ${marketId} with outcome ${winningOutcome}...`)

  await manager.resolveMarket.staticCall(marketId, winningOutcome)
  const tx = await manager.resolveMarket(marketId, winningOutcome)
  const receipt = await tx.wait()

  console.log(`Resolve tx hash: ${tx.hash}`)
  console.log(`Block: ${receipt?.blockNumber ?? "unknown"}`)
  console.log("Done.")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
