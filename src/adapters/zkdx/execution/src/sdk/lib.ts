import {UserTVLData, UserTxData} from "./types";
import {fetchGraphQLData} from "./fetch";
import path from "path";
import {JsonRpcProvider} from "ethers";

require("dotenv").config({path: path.join(__dirname, "../../.env")});

const symbols: { [key: string]: string } = {
    "0x000000000000000000000000000000000000800a": "ETH",
    "0x1a1a3b2ff016332e866787b311fcb63928464509": "USDC",
    "0x72e8561419b463b2d2c526a3fd26adb3dae78d7e":"ZUSD"
};

const decimals: { [key: string]: number } = {
    "0x000000000000000000000000000000000000800a": 18,
    "0x1a1a3b2ff016332e866787b311fcb63928464509": 6,
    "0x72e8561419b463b2d2c526a3fd26adb3dae78d7e": 18
};


function tvlQuery(blockNumber: number, lastId: string): string {
    return `
    query balances(
            $lastID: ID = "${lastId}"
            $block: Int = ${blockNumber}
    ){
        poolBalances(
            first: 1000 
            block: {number: $block}
            where:{id_gt : $lastID})
            {
                id
                pool
                account
                token
                amount
            }
        }
    `
}

export async function getAllBalances(blockNumber: number) {

    let timestamp = await getTimestampAtBlock(blockNumber);
    let result: UserTVLData[] = [];
    let page = 1;
    let hasNext = true;
    let lastId = "";

    while (hasNext) {
        let query = tvlQuery(blockNumber, lastId);
        let data: any = await fetchGraphQLData<Response>(query);
        let balances = data["poolBalances"];

        console.log(`>> Tvl processing page: ${page}, length: ${balances.length}, lastId: ${lastId}`);
        for (let i = 0; i < balances.length; i++) {
            let entity = balances[i];

            result.push({
                timestamp: timestamp,
                blockNumber: blockNumber,
                userAddress: entity["account"],
                tokenAddress: entity["token"],
                poolAddress: entity["pool"],
                balance: BigInt(entity["amount"]),
                symbol: symbols[entity["token"]],
            });
        }

        if (balances.length < 1000) {
            hasNext = false;
        } else {
            lastId = balances[999]["id"];
            page++;
        }
    }

    return result;
}


function txQuery(lastBlock: number, curBlock: number, lastId: string): string {
    return `
    query txs(
            $lastID: ID = "${lastId}"
            $startBlock: Int = ${lastBlock}
            $endBlock: Int = ${curBlock}
    ){
        transactions(
            first: 1000 
            where:{
                block_number_gte: $startBlock
                block_number_lte: $endBlock
                id_gt : $lastID
            })
            {
                id
                timestamp
                user_address
                contract_address
                token_address
                price
                amount
                block_number
                nonce
            }
        }
    `
}

export async function getAllTransactions(lastBlock: number, curBlock: number) {

    let result: UserTxData[] = [];
    let page = 1;
    let hasNext = true;
    let lastId = "";

    while (hasNext) {
        let query = txQuery(lastBlock, curBlock, lastId);
        let data: any = await fetchGraphQLData<Response>(query);
        let transactions = data["transactions"];

        console.log(`>> Tx processing page: ${page}, length: ${transactions.length}, lastId: ${lastId}`);
        for (let i = 0; i < transactions.length; i++) {
            let entity = transactions[i];
            let token = entity["token_address"];

            result.push({
                timestamp: entity["timestamp"],
                userAddress: entity["user_address"],
                contractAddress: entity["contract_address"],
                tokenAddress: token,
                decimals: decimals[token],
                price: entity["price"],
                quantity: BigInt(entity["amount"]),
                txHash: entity["id"],
                nonce: entity["nonce"],
                symbol: symbols[token],
            });
        }

        if (transactions.length < 1000) {
            hasNext = false;
        } else {
            lastId = transactions[999]["id"];
            page++;
        }
    }

    return result;
}

export const getTimestampAtBlock = async (blockNumber: number) => {
    const provider = new JsonRpcProvider("https://rpc.zklink.io");
    const block = await provider.getBlock(blockNumber);
    return Number(block?.timestamp);
};
