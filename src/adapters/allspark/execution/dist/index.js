"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTransactionData = void 0;
const lib_1 = require("./sdk/lib");
const getUserTransactionData = async (startBlock, endBlock) => {
    console.log(`Get Tx Data From ${startBlock} to ${endBlock}`);
    return await (0, lib_1.getUserTXAtBlock)(startBlock, endBlock);
};
exports.getUserTransactionData = getUserTransactionData;
//# sourceMappingURL=index.js.map