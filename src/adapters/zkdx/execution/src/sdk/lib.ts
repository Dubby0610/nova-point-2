import {UserTVLData} from "./types";
import {fetchGraphQLData} from "./fetch";
import path from "path";
import {JsonRpcProvider} from "ethers";

require("dotenv").config({path: path.join(__dirname, "../../.env")});

const assets: { [key: string]: string } = {
    "0x000000000000000000000000000000000000800a": "ETH",
    "0x1a1a3b2ff016332e866787b311fcb63928464509": "USDC",
};

function tvlQuery(blockNumber: number, lastId: string): string {
    return `
    query balances(
            $lastID: ID = "${lastId}"
            $block: Int = ${blockNumber}
    ){
        stakingBalances(
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
        let balances = data["stakingBalances"];

        console.log(`>> processing page: ${page}, length: ${balances.length}, lastId: ${lastId}`);
        for (let i = 0; i < balances.length; i++) {
            let entity = balances[i];

            result.push({
                timestamp: timestamp,
                blockNumber: blockNumber,
                userAddress: entity["account"],
                tokenAddress: entity["token"],
                poolAddress: entity["pool"],
                balance: BigInt(entity["amount"]),
                symbol: assets[entity["token"]],
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

export const getTimestampAtBlock = async (blockNumber: number) => {
    const provider = new JsonRpcProvider("https://rpc.zklink.io");
    const block = await provider.getBlock(blockNumber);
    return Number(block?.timestamp);
};
