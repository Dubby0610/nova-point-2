import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import dotenv from "dotenv";

interface Argv {
  directory: string;
}

const argv: Argv = yargs(hideBin(process.argv))
  .options({
    directory: { type: "string", demandOption: true, description: "The subgraph directory to deploy" },
  })
  .parseSync() as Argv;

const subgraphDir = "./subgraph";
const subgraphToDeploy: string = argv.directory;

function deploySubgraph(directory: string): void {
  dotenv.config({ path: path.resolve(directory, ".env") });
  const subgraphPathSecret = process.env.SUBGRAPH_PATH_SECRET;

  if (!subgraphPathSecret) {
    console.error("SUBGRAPH_PATH_SECRET environment variable is not defined.");
    process.exit(1);
  }

  console.log(`Deploying subgraph in directory: ${directory}`);

  process.chdir(directory);

  console.log("Clean deprecated files...");
  execSync("graph clean", { stdio: "inherit" });

  console.log("Installing dependencies...");
  execSync("yarn install", { stdio: "inherit" });

  console.log("Generating schema code...");
  execSync("graph codegen", { stdio: "inherit" });

  console.log("Building the subgraph...");
  execSync("graph build", { stdio: "inherit" });

  console.log("Registers a subgraph name");
  execSync(`graph create ${subgraphPathSecret} --node http://3.114.68.110:8020`, { stdio: "inherit" });

  console.log("Deploying the subgraph...");
  execSync(`graph deploy ${subgraphPathSecret} --ipfs http://3.114.68.110:5001 --node http://3.114.68.110:8020`, {
    stdio: "inherit",
  });

  
  process.chdir("..");
}

const fullPath: string = path.join(__dirname, subgraphToDeploy, subgraphDir);
if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
  console.log("process full path: ", fullPath);

  deploySubgraph(fullPath);
} else {
  console.error("Specified subgraph directory does not exist:", fullPath);
}

console.log("Deployment completed.");
