const fs = require("fs");
const path = require("path");

const { write } = require("fast-csv");

// Get the folder name from command line arguments
const folderName = process.argv[2];
const curBlockNumber = process.argv[3];
const lastBlockNumber = process.argv[4];

if (!folderName) {
  console.error("Folder name not provided. Please provide the folder name as an argument.");
  process.exit(1);
}

if (!lastBlockNumber) {
  console.error("lastBlockNumber not provided. Please provide the lastBlockNumber as an argument.");
  process.exit(1);
}

if (!curBlockNumber) {
  console.error("curBlockNumber not provided. Please provide the curBlockNumber as an argument.");
  process.exit(1);
}

// Get the absolute path of the provided folder
const folderPath = path.resolve(folderName);

// Check if the provided folder exists
if (!fs.existsSync(folderPath)) {
  console.error(`Folder '${folderPath}' does not exist.`);
  process.exit(1);
}

// Check if the provided folder contains index.ts file
const indexPath = path.join(folderPath, "execution/dist/index.js");
if (!fs.existsSync(indexPath)) {
  console.error(`Folder '${folderName}' does not contain index.ts file.`);
  process.exit(1);
}

// Import the funct function from the provided folder
const { getUserTransactionData, getUserTVLData } = require(indexPath);

if (getUserTransactionData) {
  getUserTransactionData(Number(lastBlockNumber), Number(curBlockNumber)).then((result) => {
    const allCsvRows = [];
    const keyMap = new Map();
    try {
      // check : item of result must be an object with keys: address, poolAddress, tokenAddress, blockNumber, balance
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

        const key = item.txHash;
        if (keyMap.get(key)) {
          console.error("getUserTVLData Duplicate key: ", key);
          console.error("Exiting the process due to duplicate key, please fix the issue and try again.");
          process.exit(1);
        } else {
          keyMap.set(key, true);
        }
      }

      const resultTmp = result.map((item) => {
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
          blockNumber: curBlockNumber,
        };
      });

      // Accumulate CSV rows for all blocks
      allCsvRows.push(...resultTmp);
      const file = `${folderName}/data/tx.${curBlockNumber}.csv`;
      // Write to file when batch size is reached or at the end of loop
      fs.mkdirSync(`${folderName}/data`, { recursive: true });
      const ws = fs.createWriteStream(file, { flags: "w" });
      write(allCsvRows, { headers: true })
        .pipe(ws)
        .on("finish", () => {
          console.log(`CSV file has been written.`);
        })
        .on("error", (e) => {
          console.log("write error:", e);
        });
      // Clear the accumulated CSV rows
      allCsvRows.length = 0;
    } catch (error) {
      console.error(`An error occurred for block ${curBlockNumber}:`, error);
    }
  });
}

if (getUserTVLData) {
  getUserTVLData(Number(curBlockNumber)).then((result) => {
    const allCsvRows = [];
    const keyMap = new Map();
    try {
      // check : item of result must be an object with keys: address, poolAddress, tokenAddress, blockNumber, balance
      for (const item of result) {
        const key = item.userAddress + item.tokenAddress;
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

      const resultTmp = result.map((item) => {
        return {
          userAddress: item.userAddress,
          poolAddress: item.poolAddress,
          tokenAddress: item.tokenAddress,
          blockNumber: item.blockNumber,
          balance: item.balance,
          timestamp: item.timestamp,
        };
      });

      // Accumulate CSV rows for all blocks
      allCsvRows.push(...resultTmp);
      const file = `${folderName}/data/tvl.${curBlockNumber}.csv`;
      fs.mkdirSync(`${folderName}/data`, { recursive: true });

      const ws = fs.createWriteStream(file, { flags: "w" });
      write(allCsvRows, { headers: true })
        .pipe(ws)
        .on("finish", () => {
          console.log(`${file} has been written.`);
        });
      // Clear the accumulated CSV rows
      allCsvRows.length = 0;

      // Write to file when batch size is reached or at the end of loop
    } catch (error) {
      console.error(`An error occurred for block ${curBlockNumber}:`, error);
    }
  });
}
