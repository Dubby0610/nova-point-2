import { RubicSwappedGenericSchema, RubicSwappedGenericsRes, PageWithTrsanctionsInChain, UserTxData, TransactionFromBackend } from "./types"
import { ethers } from 'ethers'
import ERC20_ABI from "./ERC20.json"
import path from "path";

require('dotenv').config({ path: path.join(__dirname, "../.env") })

const RUBIC_MULTI_PROXY_ADDRESS = '0x1a979E2386595837BaAB90Ba12B2E2a71C652576'
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'
const SUBGRAPH_ENDPOINT = process.env.SUBGRAPH_ENDPOINT as string
const RUBIC_API_ENDPOINT = 'https://api.rubic.exchange/api/v2'

if (!SUBGRAPH_ENDPOINT) {
  console.error("SUBGRAPH_ENDPOINT variable doesn't exist! Create .env file and add this one.");
  process.exit(1);
}

export const getUserTransactionData = async (startBlock: number, endBlock: number): Promise<UserTxData[]> => {
  console.log(`Get Tx Data From ${startBlock} to ${endBlock}`)

  const manager = new RubicQueriesManager(startBlock, endBlock)
  const results = await Promise.all([
    manager.queryOnChainInfo(),
    manager.queryCrossChainInfo()
  ])
  const transactions = results.flat()

  return transactions;
};

class RubicQueriesManager {
  private _provider = new ethers.providers.JsonRpcProvider('https://rpc.zklink.io')

  private _retry: {count: number} = {count: 0}

  private _startBlock: number

  private _endBlock: number

  private _pageSize: number = 2000;

  constructor(start: number, end: number) {
    this._startBlock = start;
    this._endBlock = end;
  }

  public async queryOnChainInfo(): Promise<UserTxData[]> {
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
      SUBGRAPH_ENDPOINT, 
    {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' }
    })

    if(!res.ok){
      return retryRequest(this.queryOnChainInfo.bind(this), this._retry)
    }

    const data = await res.json() as RubicSwappedGenericsRes

    const transfers = data.data?.rubicSwappedGenerics || []
    const promises = transfers.map(el => this.mapRSG(el))
    const result = await Promise.all(promises)
    
    return result
  }

  public async queryCrossChainInfo(): Promise<UserTxData[]> {
    const [startTimestamp, endTimestamp] = await Promise.all([
      this.getBlockTimestamp(this._startBlock),
      this.getBlockTimestamp(this._endBlock)
    ])

    return this.queryAllCrossChainTransactions(startTimestamp, endTimestamp)
  }

  private async queryAllCrossChainTransactions(startTimestamp: number, endTimestamp: number): Promise<UserTxData[]> {
    const firstPage = await this.queryPageWithTransactions(startTimestamp, endTimestamp, 1)
    const promises = [] as Promise<PageWithTrsanctionsInChain>[]
    const totalPageCount = Math.ceil(firstPage.count / this._pageSize)
    for(let page = 1; page <= totalPageCount; page++) {
      const req = this.queryPageWithTransactions(startTimestamp, endTimestamp, page);
      promises.push(req)
    }
    const pages = await Promise.allSettled(promises); 

    const transactions = pages
        .filter(res => res.status === 'fulfilled')
        .map(resolved => (resolved as PromiseFulfilledResult<PageWithTrsanctionsInChain>).value)
        .map(p => p.results.map(tx => this.mapCrossChainTxInfo(tx)))
        .flat()

        
    return transactions
  }

  private async queryPageWithTransactions(startTimestamp: number, endTimestamp: number, pageNumber: number): Promise<PageWithTrsanctionsInChain>{
    const params = `startTimestampInSeconds=${startTimestamp}&endTimestampInSeconds=${endTimestamp}&page=${pageNumber}&pageSize=${this._pageSize}`
    const res = await fetch(
      `${RUBIC_API_ENDPOINT}/trades/crosschain/all_to_zklink?${params}
      `, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      })  
    const page = await res.json() as PageWithTrsanctionsInChain
    return page
  }

  private mapCrossChainTxInfo(tx: TransactionFromBackend): UserTxData {
    return {
      blockNumber: tx.sourceChainBlockNumber,
      contractAddress: tx.contractAddress,
      decimals: tx.tokenDecimals,
      nonce: tx.nonce.toString(),
      quantity: BigInt(tx.quantity),
      timestamp: tx.timestamp,
      tokenAddress: tx.tokenAddress,
      txHash: tx.sourceTxHash,
      userAddress: tx.userAddress
    }
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

  private async getBlockTimestamp(blockNumber: number): Promise<number> {
    const block = await this._provider.getBlock(blockNumber);
    return block.timestamp;
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