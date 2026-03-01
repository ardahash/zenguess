require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()

const mainnetRpc =
  process.env.HORIZEN_MAINNET_RPC_HTTP ||
  process.env.NEXT_PUBLIC_HORIZEN_MAINNET_RPC_HTTP ||
  "https://horizen.calderachain.xyz/http"

const testnetRpc =
  process.env.HORIZEN_TESTNET_RPC_HTTP ||
  process.env.NEXT_PUBLIC_HORIZEN_TESTNET_RPC_HTTP ||
  "https://horizen-testnet.rpc.caldera.xyz/http"

function normalizePrivateKey(value) {
  if (!value || value.trim().length === 0) {
    return undefined
  }

  return value.startsWith("0x") ? value : `0x${value}`
}

const deployerPrivateKey = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY)
const accounts = deployerPrivateKey ? [deployerPrivateKey] : []

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    horizenTestnet: {
      url: testnetRpc,
      chainId: 2_651_420,
      accounts,
    },
    horizenMainnet: {
      url: mainnetRpc,
      chainId: 26_514,
      accounts,
    },
  },
}
