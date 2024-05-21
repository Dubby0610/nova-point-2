import { UserTxData } from "./types";

export async function getUserTXAtBlock(startBlock: number, endBlock: number) {
  const response = await fetch('https://api.allspark.finance/zklink-mantissa-api/getNovaPoint', {
      method: 'POST',
      body: JSON.stringify({ startBlock: startBlock, endBlock: endBlock }),
      headers: { 'Content-Type': 'application/json' },
    });

  const data = await response.json();
  const userTxData: UserTxData[] = data.data.map((item: any) => {
    return {
      timestamp: item.timestamp,
      userAddress: item.userAddress,
      contractAddress: item.contractAddress,
      tokenAddress: item.tokenAddress,
      decimals: item.decimals,
      quantity: BigInt(item.quantity),
      txHash: item.txHash,
      nonce: item.nonce,
      blockNumber: item.blockNumber,
    };
  });

  return userTxData;
}
