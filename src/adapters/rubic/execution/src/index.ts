import { RubicSwappedGenericSchema, RubicSwappedGenericsRes, RubicTransferStartedSchema, RubicTransferStartedsRes, UserTxData } from "./types"
import { JsonRpcProvider, ethers } from 'ethers'
import ERC20_ABI from "./ERC20.json"

const RUBIC_MULTI_PROXY_ADDRESS = '0x6AA981bFF95eDfea36Bdae98C26B274FfcafE8d3'
const ZK_LINK_CHAIN_ID = 810180;

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
  private _provider = new JsonRpcProvider('https://rpc.zklink.io')

  private _startBlock: number

  private _endBlock: number

  constructor(start: number, end: number) {
    this._startBlock = start;
    this._endBlock = start;
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
    const response = await fetch(
      "http://3.114.68.110:8000/subgraphs/name/rubic-finance-1", 
    {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as RubicSwappedGenericsRes;

    const transfers = response.data?.rubicSwappedGenerics || []
    const promises = transfers.map(el => this.mapRSG(el))
    const res = await Promise.all(promises)
    
    return res
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
    const response = await fetch(
      "http://3.114.68.110:8000/subgraphs/name/rubic-finance-1", 
    {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' }
    }) as unknown as RubicTransferStartedsRes;

    const transfers = response.data?.rubicTransferStarteds || []
    const promises = transfers
        .filter(v => v.bridgeData_destinationChainId === ZK_LINK_CHAIN_ID)
        .map(el => this.mapRTS(el))
    const res = await Promise.all(promises)
    
    return res
  }

  private async mapRSG(el: RubicSwappedGenericSchema): Promise<UserTxData> {
    const tx = await this._provider.getTransaction(el.transactionHash)
    const contract = new ethers.Contract(el.fromAssetId, ERC20_ABI)
    const decimals = await contract.decimals() as number

    return {
      blockNumber: el.blockNumber,
      contractAddress: RUBIC_MULTI_PROXY_ADDRESS,
      decimals,
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
    const contract = new ethers.Contract(el.bridgeData_sendingAssetId, ERC20_ABI)
    const decimals = await contract.decimals() as number

    return {
      blockNumber: el.blockNumber,
      contractAddress: RUBIC_MULTI_PROXY_ADDRESS,
      decimals,
      nonce: tx!.nonce.toString(),
      quantity: BigInt(el.bridgeData_minAmount),
      timestamp: el.blockTimestamp,
      tokenAddress: el.bridgeData_sendingAssetId,
      txHash: el.transactionHash,
      userAddress: el.bridgeData_receiver
    }
  }
}