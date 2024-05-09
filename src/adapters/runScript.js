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
const indexPath = path.join(folderPath, "dist/index.js");
if (!fs.existsSync(indexPath)) {
  console.error(`Folder '${folderName}' does not contain index.ts file.`);
  process.exit(1);
}

// Import the funct function from the provided folder
const { getUserTransactionDataByBlock, getUserTxNumByBlock } = require(indexPath);

if (getUserTransactionDataByBlock) {
  getUserTransactionDataByBlock(Number(lastBlockNumber), Number(curBlockNumber)).then((result) => {
    const allCsvRows = [];
    const keyMap = new Map();
    try {
      // check : item of result must be an object with keys: address, poolAddress, tokenAddress, blockNumber, balance
      for (const item of result) {
        if (
          !item.timestamp ||
          !item.userAddress ||
          !item.contractAddress ||
          !item.tokenAddress ||
          !item.decimals ||
          !item.quantity ||
          !item.txHash ||
          !item.nonce
        ) {
          console.error("Invalid item, key:", tem.txHash, ", item:", item);
          console.error(
            "Exiting the process due to invalid item in getUserTVolByBlock, please fix the issue and try again."
          );
          process.exit(1);
        }

        const key = tem.txHash;
        if (keyMap.get(key)) {
          console.error("Duplicate key: ", key);
          console.error("Exiting the process due to duplicate key, please fix the issue and try again.");
          process.exit(1);
        } else {
          keyMap.set(key, true);
        }
      }
      if (duplicateKeys > 0) {
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

      // Write to file when batch size is reached or at the end of loop
      const ws = fs.createWriteStream(`${folderName}/data/output.vol.${blockNumber}.csv`, { flags: "w" });
      write(allCsvRows, { headers: true })
        .pipe(ws)
        .on("finish", () => {
          console.log(`CSV file has been written.`);
        });
      // Clear the accumulated CSV rows
      allCsvRows.length = 0;
    } catch (error) {
      console.error(`An error occurred for block ${blockNumber}:`, error);
    }
  });
}

if (getUserTxNumByBlock) {
  getUserTxNumByBlock(Number(curBlockNumber)).then((result) => {
    const allCsvRows = [];
    const keyMap = new Map();
    try {
      // check : item of result must be an object with keys: address, poolAddress, tokenAddress, blockNumber, balance
      for (const item of result) {
        const key = item.userAddress;

        if (!item.userAddress || !item.poolAddress || !item.tokenAddress || !item.balance) {
          console.error("Invalid item, key:", item.userAddress, ", item:", item);
          console.error("Exiting the process due to invalid item, please fix the issue and try again.");
          process.exit(1);
        }

        if (keyMap.get(key)) {
          console.error("Duplicate key: ", key);
          console.error("Exiting the process due to duplicate key, please fix the issue and try again.");
          process.exit(1);
        } else {
          keyMap.set(key, true);
        }
      }

      const resultTmp = result.map((item) => {
        return {
          userAddress: item.userAddress,
          poolAddress: item.poolAddress,
          tokenAddress: item.tokenAddress,
          blockNumber: blockNumber,
          balance: item.balance,
        };
      });

      // Accumulate CSV rows for all blocks
      allCsvRows.push(...resultTmp);

      // Write to file when batch size is reached or at the end of loop
      const ws = fs.createWriteStream(`${folderName}/data/output.tvl.${blockNumber}.csv`, { flags: "w" });
      write(allCsvRows, { headers: true })
        .pipe(ws)
        .on("finish", () => {
          console.log(`CSV file has been written.`);
        });
      // Clear the accumulated CSV rows
      allCsvRows.length = 0;
    } catch (error) {
      console.error(`An error occurred for block ${blockNumber}:`, error);
    }
  });
}


