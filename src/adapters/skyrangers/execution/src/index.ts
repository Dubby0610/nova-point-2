import { UserTVLData, UserTxData } from "./sdk/types";
import { fetchGraphQLData } from "./sdk/fetch";
import { getTimestampAtBlock } from "./sdk/lib";

const apiurl = "https://api.skyrangers.io/usertransaction";

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
  let result: UserTVLData[] = [];
  let skip = 0;
  const pageSize = 1000;
  let fetchNext = true;
  while (fetchNext) {
    var query = {
      skip,
      pageSize,
      startBlock: blockNumber,
      endBlock: blockNumber,
      op: 2,
    };
    var timestamp = await getTimestampAtBlock(blockNumber);
    const data = await fetchGraphQLData<any>(query, apiurl);
    var list = data && data.list ? data.list : [];
    for (var item of list) {
      result.push({
        userAddress: item.userAddress,
        poolAddress: item.poolAddress,
        tokenAddress: item.tokenAddress,
        blockNumber: item.blockNumber,
        balance: BigInt(item.balance),
        timestamp: timestamp,
      });
    }
    if (list.length < pageSize) {
      fetchNext = false;
    } else {
      console.log(`GET DATA FROM ${skip}`);
      skip += pageSize;
    }
  }
  return result;
};

export const getUserTransactionData = async (startBlock: number, endBlock: number): Promise<UserTxData[]> => {
  console.log(`Get Tx Data From ${startBlock} to ${endBlock}`);

  var blocktimestampMap: { [blockNumber: number]: number } = {};
  let result: UserTxData[] = [];

  let skip = 0;
  const pageSize = 1000;
  let fetchNext = true;
  while (fetchNext) {
    var query = {
      skip,
      pageSize,
      startBlock,
      endBlock,
      op: 1,
    };
    const data = await fetchGraphQLData<any>(query, apiurl);
    var list = data && data.list ? data.list : [];
    for (var item of list) {
      var blockNumber = item.blockNumber;
      var timestamp = blocktimestampMap[blockNumber];
      if (!timestamp) {
        timestamp = await getTimestampAtBlock(blockNumber);
        blocktimestampMap[blockNumber] = timestamp;
      }
      result.push({
        timestamp: timestamp,
        userAddress: item.userAddress,
        contractAddress: item.contractAddress,
        tokenAddress: item.tokenAddress,
        decimals: item.decimals,
        price: item.price,
        quantity: BigInt(item.quantity),
        txHash: item.txHash,
        nonce: item.nonce,
        blockNumber: item.blockNumber,
      });
    }
    if (list.length < pageSize) {
      fetchNext = false;
    } else {
      console.log(`GET DATA FROM ${skip}`);
      skip += pageSize;
    }
  }
  return result;
};

// getUserTransactionData(4281400, 4281500)
