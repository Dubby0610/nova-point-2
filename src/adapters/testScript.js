/* eslint-disable @typescript-eslint/no-var-requires */
// runScript.js
const fs = require("fs");
const path = require("path");

// Get the folder name from command line arguments
const folderName = process.argv[2];

if (!folderName) {
  console.error("Folder name not provided. Please provide the folder name as an argument.");
  process.exit(1);
}

// Get the absolute path of the provided folder
const folderPath = path.resolve(folderName);

// Check if the provided folder exists
if (!fs.existsSync(folderPath)) {
  console.error(`Folder '${folderName}' does not exist.`);
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

// Call the getUserTVLByBlock function with desired arguments
getUserBalanceByBlock(49216, 1711023841).then((result) => {
  if (!result.length) {
    throw new Error("Empty result");
  } else {
    let count = 0,
      error = 0;

    // check : item of result must be an object with keys: address, pairAddress, tokenAddress, blockNumber, balance
    result.forEach((item, key) => {
      count++;
      if (
        !item.address ||
        !item.pairAddress ||
        !item.tokenAddress ||
        undefined === item.blockNumber ||
        undefined === item.balance ||
        typeof item.address !== "string" ||
        typeof item.pairAddress !== "string" ||
        typeof item.tokenAddress !== "string" ||
        typeof item.blockNumber !== "number" ||
        typeof item.balance !== "bigint"
      ) {
        error++;
        console.error("Invalid item, key: ", key, ", item: ", item);
      }
    });
    console.log(`Total items: ${count}, Error items: ${error}, Success items: ${count - error}`);
  }
});
