const fs = require('fs') 
const path = require('path')
const { execSync } = require('child_process')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const dotenv = require('dotenv')


// Parse command-line arguments
const argv = yargs(hideBin(process.argv)).options({
    directory: { type: 'string', demandOption: true, description: 'The subgraph directory to deploy' }
}).parseSync();

const subgraphDir = './subgraph'
const subgraphToDeploy = argv.directory; // Ensure the subgraph parameter is a string type


function deploySubgraph(directory) {
    dotenv.config({ path: path.resolve(__dirname, '.env') });
    const subgraphPathSecret = process.env.SUBGRAPH_PATH_SECRET;

    console.log(`Deploying subgraph in directory: ${directory}`);

    // Enter the directory
    process.chdir(directory);

    // Clean old directories
    console.log('Clean deprecated files...');
    execSync('graph clean', { stdio: 'inherit' });
    // Install dependencies
    console.log('Installing dependencies...');
    execSync('yarn install', { stdio: 'inherit' });

    // Generate the schema entity
    console.log('Generating schema code...');
    execSync('graph codegen', { stdio: 'inherit' });

    // Build the project
    console.log('Building the subgraph...');
    execSync('graph build', { stdio: 'inherit' });

    console.log('Registers a subgraph name')
    execSync(`graph create ${subgraphPathSecret} --node http://3.114.68.110:8020`, { stdio: 'inherit' });

    // Deploy the project
    console.log('Deploying the subgraph...');
    execSync(`graph deploy ${subgraphPathSecret} --ipfs http://3.114.68.110:5001 --node http://3.114.68.110:8020`, { stdio: 'inherit' });

    // Return to the previous directory
    process.chdir('..');
}

const fullPath = path.join(__dirname, subgraphToDeploy, subgraphDir);
if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    console.log('process full path: ', fullPath);

    deploySubgraph(fullPath);
} else {
    console.error('Specified subgraph directory does not exist:', fullPath);
}

console.log('Deployment completed.');
