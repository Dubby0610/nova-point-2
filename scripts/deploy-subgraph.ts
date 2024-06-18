import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

interface Argv {
  project: string;
  ipfsUrl: string;
  nodeUrl: string;
}

const argv: Argv = yargs(hideBin(process.argv))
  .options({
    project: { type: "string", alias: "p", demandOption: true, description: "The project to deploy" },
    ipfsUrl: { type: "string", demandOption: true, description: "IPFS URL" },
    nodeUrl: { type: "string", demandOption: true, description: "Node URL" }
  })
  .parseSync() as Argv;

const adaptersPath = path.join(__dirname, "../src/adapters");

function getProjects(basePath: string): { [key: string]: string } {
  const dirs = fs.readdirSync(basePath, { withFileTypes: true });
  const projects: { [key: string]: string } = {};

  dirs.forEach(dir => {
    if (dir.isDirectory()) {
      const projectPath = path.join(basePath, dir.name, "subgraph");
      if (fs.existsSync(projectPath)) {
        projects[dir.name] = projectPath;
      }
    }
  });

  return projects;
}

const projects = getProjects(adaptersPath);
const project = projects[argv.project];

if (!project) {
  console.error(`Project '${argv.project}' is not defined in '${adaptersPath}'.`);
  process.exit(1);
}

function deploySubgraph(directory: string, subgraphPathSecret: string, ipfsUrl: string, nodeUrl: string): void {

  console.log(`Deploying subgraph in directory: ${directory}`);

  process.chdir(directory);

  console.log("Clean deprecated files...");
  execSync("graph clean", { stdio: "inherit" });

  console.log("Installing dependencies...");
  execSync("npm install", { stdio: "inherit" });

  console.log("Generating schema code...");
  execSync("graph codegen", { stdio: "inherit" });

  console.log("Building the subgraph...");
  execSync("graph build", { stdio: "inherit" });

  console.log("Registers a subgraph name");
  execSync(`graph create ${subgraphPathSecret} --node ${nodeUrl}`, { stdio: "inherit" });

  console.log("Deploying the subgraph...");
  execSync(`graph deploy ${subgraphPathSecret} --ipfs ${ipfsUrl} --node ${nodeUrl}`, { stdio: "inherit" });

  process.chdir("..");
}

const subgraphPathSecret = `${argv.project}-points`;
deploySubgraph(project, subgraphPathSecret, argv.ipfsUrl, argv.nodeUrl);

console.log("Deployment completed.");
