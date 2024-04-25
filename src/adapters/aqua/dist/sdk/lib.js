"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimestampAtBlock = exports.getUserPositionsAtBlock = void 0;
const ethers_1 = require("ethers");
const getUserPositionsAtBlock = async (blockNumber) => {
    let result = [];
    let skip = 0;
    let fetchNext = true;
    while (fetchNext) {
        const query = `query MyQuery {
      userPositions(block: {number: ${blockNumber}}, skip: ${skip}) {
        id
        positions {
            balance
            blockNumber
            decimal
            pool
            token
            transactionHash
            id
          }
        }
      }`;
        const response = await fetch('https://graph.zklink.io/subgraphs/name/aqua-points', {
            method: 'POST',
            body: JSON.stringify({ query }),
            headers: { 'Content-Type': 'application/json' },
        });
        const { data } = await response.json();
        const { userPositions } = data;
        const res = userPositions.map(data => {
            const userAddress = data.id;
            const balance = data.positions.map((item) => {
                return {
                    address: userAddress,
                    pairAddress: item.pool,
                    tokenAddress: item.token,
                    blockNumber: blockNumber,
                    balance: BigInt(item.balance)
                };
            });
            return balance;
        });
        result.push(...res.flat());
        if (userPositions.length < 100) {
            fetchNext = false;
        }
        else {
            skip += 100;
        }
    }
    return result;
};
exports.getUserPositionsAtBlock = getUserPositionsAtBlock;
const getTimestampAtBlock = async (blockNumber) => {
    const provider = new ethers_1.JsonRpcProvider('https://rpc.zklink.io');
    const block = await provider.getBlock(blockNumber);
    return Number(block?.timestamp);
};
exports.getTimestampAtBlock = getTimestampAtBlock;
