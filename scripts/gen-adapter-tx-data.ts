import fs from "fs";
import path from "path";
import { write } from "fast-csv";

interface UserTransactionData {
  timestamp: number;
  userAddress: string;
  contractAddress: string;
  tokenAddress: string;
  decimals: number;
  price: number;
  quantity: number;
  txHash: string;
  nonce: number;
  blockNumber: number;
}

const args = process.argv.slice(2);
const folderName: string | undefined = args[0];
const filePrefix: string | undefined = args[1];
const prevBlockNumber: string | undefined = args[2];
const curBlockNumber: string | undefined = args[3];

if (!folderName) {
  console.error("Folder name not provided. Please provide the folder name as 1st argument.");
  // console.error("Folder name not provided. Please provide the folder name as 1st argument.");
  process.exit(1);
}

if (!filePrefix) {
  console.error("File Prefix not provided. Please provide the folder name as 2st argument.");
  process.exit(1);
}

if (!prevBlockNumber) {
  console.error("prevBlockNumber not provided. Please provide the lastBlockNumber as 3rd argument.");
  process.exit(1);
}

if (!curBlockNumber) {
  console.error("curBlockNumber not provided. Please provide the curBlockNumber as 4th argument.");
  process.exit(1);
}

const folderPath: string = path.join(__dirname, '../src/adapters', folderName);

if (!fs.existsSync(folderPath)) {
  console.error(`Folder '${folderPath}' does not exist.`);
  process.exit(1);
}

const indexPath: string = path.join(folderPath, "execution/dist/index.js");
if (!fs.existsSync(indexPath)) {
  console.error(`Folder '${folderName}' does not contain index.ts file.`);
  process.exit(1);
}

const { getUserTransactionData } = require(indexPath);

if (getUserTransactionData) {
  getUserTransactionData(Number(prevBlockNumber), Number(curBlockNumber)).then((result: UserTransactionData[]) => {
    const keyMap = new Map<string, boolean>();
    try {
      for (const item of result) {
        if (
          item.timestamp === undefined ||
          item.userAddress === undefined ||
          item.contractAddress === undefined ||
          item.tokenAddress === undefined ||
          item.decimals === undefined ||
          item.quantity === undefined ||
          item.txHash === undefined ||
          item.nonce === undefined
        ) {
          console.error("getUserTVLData Invalid item:", item);
          console.error(
            "Exiting the process due to invalid item in getUserTVolByBlock, please fix the issue and try again."
          );
          process.exit(1);
        }

        const key = `${item.txHash}-${item.nonce}`;
        if (keyMap.get(key)) {
          console.error("getUserTVLData Duplicate key: ", key);
          console.error("Exiting the process due to duplicate key, please fix the issue and try again.");
          process.exit(1);
        } else {
          keyMap.set(key, true);
        }
      }

      const allCsvRows = result.map((item) => {
        return {
          userAddress: item.userAddress,
          contractAddress: item.contractAddress,
          tokenAddress: item.tokenAddress,
          decimals: item.decimals,
          price: item.price,
          quantity: item.quantity,
          txHash: item.txHash,
          nonce: item.nonce,
          timestamp: item.timestamp,
          blockNumber: item.blockNumber,
        };
      });

      const file = path.join(folderPath, `/data/${filePrefix}.${curBlockNumber}.csv`)
      fs.mkdirSync(`${folderPath}/data`, { recursive: true });
      const ws = fs.createWriteStream(file, { flags: "w" });
      write(allCsvRows, { headers: true })
        .pipe(ws)
        .on("finish", () => {
          console.log(`${file} has been written.`);
          process.exit(0);
        })
        .on("error", (e) => {
          console.log("write error:", e);
          process.exit(1);
        });
    } catch (error) {
      console.error(`An error occurred for block ${curBlockNumber}:`, error);
      process.exit(1);
    }
  });
}

