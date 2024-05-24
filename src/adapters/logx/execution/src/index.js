// https://github.com/zkLinkProtocol/nova-point-v2/pull/10

const axios = require("axios");
const ethers = require("ethers");

async function getUserTVLData(blockNumber) {
  const res = (await axios.get("https://backend-lp.logx.trade/zklink/tvl?blockNumber=" + blockNumber)).data;
  const timestamp = await getTimestampAtBlock(blockNumber);
  const tokenAddress = "0x2F8A25ac62179B31D62D7F80884AE57464699059";
  const poolAddress = "0x75940cDa18F14D1F97562fc2A6dBCe31CBe03870";
  const symbol = "USDT";

  const returnArray = res.map((item) => {
    return {
      blockNumber: blockNumber,
      timestamp: timestamp,
      userAddress: item.user,
      tokenAddress: tokenAddress,
      poolAddress: poolAddress,
      balance: item.tvl,
      symbol: symbol,
    };
  });
  return returnArray;
}

async function getUserTransactionData(startBlock, endBlock) {
  const res = (
    await axios.get("https://backend-lp.logx.trade/zklink/volume?startBlock=" + startBlock + "&endBlock=" + endBlock)
  ).data;
  const contractAddress = "0x75940cDa18F14D1F97562fc2A6dBCe31CBe03870";
  const tokenAddress = "0x2F8A25ac62179B31D62D7F80884AE57464699059";
  const decimals = 6;
  const price = 1;
  const symbol = "USDT";

  const returnArray = res.map((item) => {
    return {
      blockNumber: item.blockNumber,
      timestamp: Math.floor(new Date(item.timestamp).getTime() / 1000),
      userAddress: item.account,
      contractAddress: contractAddress,
      tokenAddress: tokenAddress,
      decimals: decimals,
      price: price,
      quantity: BigInt(Math.trunc((Number(item.sizeDelta) / 1e30) * 1e6)),
      txHash: item.txhash,
      nonce: item.blockNumber * Math.random(), // randomise it so it's unique
      symbol: symbol,
    };
  });
  return returnArray;
}

async function getTimestampAtBlock(blockNumber) {
  const provider = new ethers.JsonRpcProvider("https://rpc.zklink.io");
  const block = await provider.getBlock(blockNumber);
  return Number(block?.timestamp);
}

module.exports = {
  getUserTVLData,
  getUserTransactionData,
};
