import fs from "fs";
import path from "path";
import { write } from "fast-csv";

interface UserTVLData {
  userAddress: string;
  poolAddress: string;
  tokenAddress: string;
  blockNumber: number;
  balance: number;
  timestamp: number;
}

const args = process.argv.slice(2);
const folderName: string | undefined = args[0];
const filePrefix: string | undefined = args[1];
const curBlockNumber: string | undefined = args[2];
if (!folderName) {
  console.error("Folder name not provided. Please provide the folder name as 1st argument.");
  process.exit(1);
}

if (!filePrefix) {
  console.error("File prefix not provided. Please provide the file prefix as 2ed argument.");
  process.exit(1);
}

if (!curBlockNumber) {
  console.error("curBlockNumber not provided. Please provide the curBlockNumber as 3rd argument.");
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

const { getUserTVLData } = require(indexPath);

if (getUserTVLData) {
  getUserTVLData(Number(curBlockNumber)).then((result: UserTVLData[]) => {
    const keyMap = new Map<string, UserTVLData>();
    try {
      for (const item of result) {
        const key = item.userAddress + item.tokenAddress + item.poolAddress;
        if (
          item.userAddress === undefined ||
          item.poolAddress === undefined ||
          item.tokenAddress === undefined ||
          item.balance === undefined ||
          item.timestamp === undefined
        ) {
          console.error("getUserTVLData Invalid item:", item);
          console.error("Exiting the process due to invalid item, please fix the issue and try again.");
          process.exit(1);
        }

        if (keyMap.get(key)) {
          console.error("getUserTVLData Duplicate key: ", key, item, keyMap.get(key));
          console.error("Exiting the process due to duplicate key, please fix the issue and try again.");
          process.exit(1);
        } else {
          keyMap.set(key, item);
        }
      }

      const allCsvRows = result.map((item) => {
        return {
          userAddress: item.userAddress,
          poolAddress: item.poolAddress,
          tokenAddress: item.tokenAddress,
          blockNumber: item.blockNumber,
          balance: item.balance,
          timestamp: item.timestamp,
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
        });
    } catch (error) {
      console.error(`An error occurred for block ${curBlockNumber}:`, error);
      process.exit(1);
    }
  });
}
