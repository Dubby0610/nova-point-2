import { UserTVLData, UserTxData } from './sdk/types';
import {
  getAllUserPosition,
  getSwapTxList,
  getTimestampAtBlock,
  getVaultTotalSupplied,
} from './sdk/lib';
import { Contract, JsonRpcProvider } from 'ethers';
import { ReaderContractAddress, RouteContractAddress, VaultContractAddress } from "./constant";
import VaultABI from './abi/Vault.json'
import ReaderABI from './abi/Reader.json'

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
  const provider = new JsonRpcProvider("https://rpc.zklink.io");

  const timestamp = await getTimestampAtBlock(blockNumber);

  const allUserPosition = await getAllUserPosition(blockNumber);
  const vaultTotalSupplied = await getVaultTotalSupplied()
  const vaultContract = new Contract(VaultContractAddress, VaultABI, provider)
  const readerContract = new Contract(ReaderContractAddress, ReaderABI, provider)
  const tokenLen = await vaultContract.allWhitelistedTokensLength()
  const allTokenAddress = await Promise.all([...Array(Number(tokenLen)).keys()].map(async (_, index) => {
    const address = await vaultContract.allWhitelistedTokens(index)
    return address
  }))

  const allTokenBalanceList = await readerContract.getTokenBalances(VaultContractAddress, allTokenAddress) as bigint[]
  const allUserPositionList = allUserPosition.map(position => {
    return allTokenBalanceList.map((balance, index) => ({
      userAddress: position.id,
      poolAddress: VaultContractAddress,
      tokenAddress: allTokenAddress[index],
      balance: balance * BigInt(position.balance) / BigInt(vaultTotalSupplied),
      blockNumber: blockNumber,
      timestamp: timestamp,
    }))
  })
  return allUserPositionList.flat()
};

export const getUserTransactionData = async (startBlock: number, endBlock: number): Promise<UserTxData[]> => {
  const swaps = await getSwapTxList(startBlock, endBlock)
  return swaps.map(swapInfo => ({
    timestamp: swapInfo.timestamp,
    userAddress: swapInfo.account,
    contractAddress: RouteContractAddress,
    tokenAddress: swapInfo.tokenAddress,
    decimals: swapInfo.decimal,
    price: swapInfo.price,
    quantity: swapInfo.amount,
    txHash: swapInfo.transactionHash,
    nonce: swapInfo.nonce,
    blockNumber: swapInfo.blockNumber
  }))
};

// getUserTVLData(18921)
// getUserTransactionData(16921, 18921)

