"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTXAtBlock = void 0;
async function getUserTXAtBlock(startBlock, endBlock) {
    const response = await fetch('https://api.allspark.finance/zklink-mantissa-api/getNovaPoint', {
        method: 'POST',
        body: JSON.stringify({ startBlock: startBlock, endBlock: endBlock }),
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    const userTxData = data.data.map((item) => {
        return {
            timestamp: item.timestamp,
            userAddress: item.userAddress,
            contractAddress: item.contractAddress,
            tokenAddress: item.tokenAddress,
            decimals: item.decimals,
            price: item.price,
            quantity: BigInt(item.quantity),
            txHash: item.txHash,
            nonce: item.nonce,
            blockNumber: item.blockNumber,
        };
    });
    return userTxData;
}
exports.getUserTXAtBlock = getUserTXAtBlock;
//# sourceMappingURL=lib.js.map