/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");

const csv = require("csv-parser");
const { write } = require("fast-csv");

// Get the folder name from command line arguments
const folderName = process.argv[2];
const blockNumber = process.argv[3];
const blockTimestamp = process.argv[4];

if (!folderName) {
  console.error("Folder name not provided. Please provide the folder name as an argument.");
  process.exit(1);
}

if (!blockNumber) {
  console.error("BlockNumber not provided. Please provide the blockNumber as an argument.");
  process.exit(1);
}

if (!blockTimestamp) {
  console.error("BlockTimestamp not provided. Please provide the blockTimestamp as an argument.");
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
const { getUserBalanceByBlock } = require(indexPath);

getUserBalanceByBlock(Number(blockNumber), Number(blockTimestamp)).then((result) => {
  const allCsvRows = [];
  try {
    // check : item of result must be an object with keys: address, pairAddress, tokenAddress, blockNumber, balance
    result.forEach((item, key) => {
      if (
        !item.address ||
        !item.pairAddress ||
        !item.tokenAddress ||
        undefined === item.blockNumber ||
        undefined === item.balance ||
        typeof item.address !== "string" ||
        typeof item.pairAddress !== "string" ||
        typeof item.tokenAddress !== "string" 
      ) {
        console.error("Invalid item, key:", key, ", item:", item);
        console.error("Exiting the process due to invalid item, please fix the issue and try again.");
        process.exit(1);
      }
    });

    // Accumulate CSV rows for all blocks
    allCsvRows.push(...result);

    // Write to file when batch size is reached or at the end of loop
    const ws = fs.createWriteStream(`${folderName}/data/output.${blockNumber}.csv`, { flags: "w" });
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
