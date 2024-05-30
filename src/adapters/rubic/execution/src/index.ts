import { RubicSwappedGenericSchema, RubicSwappedGenericsRes, RubicTransferStartedSchema, RubicTransferStartedsRes, UserTxData } from "./types"
import { ethers } from 'ethers'
import ERC20_ABI from "./ERC20.json"
import path from "path";

require('dotenv').config({ path: path.join(__dirname, "../.env") })

const RUBIC_MULTI_PROXY_ADDRESS = '0x1a979E2386595837BaAB90Ba12B2E2a71C652576'
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZK_LINK_CHAIN_ID = 810180
const ENDPOINT = process.env.SUBGRAPH_ENDPOINT as string

if (!ENDPOINT) {
  console.error("SUBGRAPH_ENDPOINT variable doesn't exist! Create .env file and add this one.");
  process.exit(1);
}

export const getUserTransactionData = async (startBlock: number, endBlock: number): Promise<UserTxData[]> => {
  console.log(`Get Tx Data From ${startBlock} to ${endBlock}`)

  const manager = new RubicQueriesManager(startBlock, endBlock)
  const [onchainSwaps, ccrSwaps] = await Promise.all([
      manager.queryRubicSwappedGenerics(),
      manager.queryRubicTransferStarteds()
  ])
  const transactions = [...onchainSwaps, ...ccrSwaps]

  return transactions
};

class RubicQueriesManager {
  private _provider = new ethers.providers.JsonRpcProvider('https://rpc.zklink.io')

  private _retry: {count: number} = {count: 0}

  private _startBlock: number

  private _endBlock: number

  constructor(start: number, end: number) {
    this._startBlock = start;
    this._endBlock = end;
  }

  public async queryRubicSwappedGenerics(): Promise<UserTxData[]> {
    const query = `query MyQuery {
      rubicSwappedGenerics(where: {
        blockNumber_gte: ${this._startBlock},
        blockNumber_lte: ${this._endBlock}
      }){
        fromAssetId
        fromAmount
        transactionHash
        blockTimestamp
        blockNumber
      }
    }
    `
    const res = await fetch(
      ENDPOINT, 
    {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' }
    });

    if(!res.ok){
      return retryRequest(this.queryRubicSwappedGenerics.bind(this), this._retry)
    }

    const data = await res.json() as RubicSwappedGenericsRes

    const transfers = data.data?.rubicSwappedGenerics || []
    const promises = transfers.map(el => this.mapRSG(el))
    const result = await Promise.all(promises)
    
    return result
  }

  public async queryRubicTransferStarteds(): Promise<UserTxData[]> {
    const query = `query MyQuery {
      rubicTransferStarteds(where: {
        blockNumber_gte: ${this._startBlock},
        blockNumber_lte: ${this._endBlock}
      }) {
        bridgeData_sendingAssetId
        bridgeData_destinationChainId
        bridgeData_receiver
        bridgeData_minAmount
        blockNumber
        blockTimestamp
        transactionHash
    }
    `
    const res = await fetch(
      ENDPOINT, 
    {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' }
    });

    if(!res.ok){
      return await retryRequest(this.queryRubicTransferStarteds.bind(this), this._retry)
    }

    const data = await res.json() as RubicTransferStartedsRes

    const transfers = data.data?.rubicTransferStarteds || []
    const promises = transfers
        .filter(v => v.bridgeData_destinationChainId === ZK_LINK_CHAIN_ID)
        .map(el => this.mapRTS(el))
    const result = await Promise.all(promises)
    
    return result
  }

  private async mapRSG(el: RubicSwappedGenericSchema): Promise<UserTxData> {
    const tx = await this._provider.getTransaction(el.transactionHash)
    const isNative = el.fromAssetId === EMPTY_ADDRESS
    const contract = new ethers.Contract(el.fromAssetId, ERC20_ABI, this._provider)

    return {
      blockNumber: el.blockNumber,
      contractAddress: RUBIC_MULTI_PROXY_ADDRESS,
      decimals: isNative ? 18 : await contract.decimals(),
      nonce: tx!.nonce.toString(),
      quantity: BigInt(el.fromAmount),
      timestamp: el.blockTimestamp,
      tokenAddress: el.fromAssetId,
      txHash: el.transactionHash,
      userAddress: tx!.from
    }
  }

  private async mapRTS(el: RubicTransferStartedSchema): Promise<UserTxData> {
    const tx = await this._provider.getTransaction(el.transactionHash)
    const isNative = el.bridgeData_sendingAssetId === EMPTY_ADDRESS
    const contract = new ethers.Contract(el.bridgeData_sendingAssetId, ERC20_ABI, this._provider)

    return {
      blockNumber: el.blockNumber,
      contractAddress: RUBIC_MULTI_PROXY_ADDRESS,
      decimals: isNative ? 18 : await contract.decimals(),
      nonce: tx!.nonce.toString(),
      quantity: BigInt(el.bridgeData_minAmount),
      timestamp: el.blockTimestamp,
      tokenAddress: el.bridgeData_sendingAssetId,
      txHash: el.transactionHash,
      userAddress: el.bridgeData_receiver
    }
  }
}

async function retryRequest<T>(cb: () => Promise<T>, retry: {count: number}): Promise<T> {
  try {
    return await cb();
  } catch (error) {
    if (retry.count >= 4) {
      throw new Error(`Fetch failed in ${cb.name} after ${retry.count + 1} attempts`);
    }
    retry.count++;
    await wait(1000);
    return retryRequest(cb, retry);
  }
}

async function wait(ms: number): Promise<void> {
  return new Promise(res => {
    setTimeout(() => res(), ms)
  })
}