"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBalanceByBlock = void 0;
const lib_1 = require("./sdk/lib");
const getUserBalanceByBlock = async (blockNumber, blockTimestamp) => {
    const res = await (0, lib_1.getUserPositionsAtBlock)(blockNumber);
    return res.map(item => ({ ...item, block_number: blockNumber, timestamp: blockTimestamp }));
};
exports.getUserBalanceByBlock = getUserBalanceByBlock;
