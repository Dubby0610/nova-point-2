# Shoebill Subgraph

This repository contains the Subgraph configuration for Shoebill, a decentralized finance protocol. This Subgraph indexes and exposes data related to liquidity pools and user positions on the `zklink-nova` network using The Graph protocol.

## Overview

The Subgraph is designed to index events emitted by the Shoebill smart contracts. It tracks liquidity pool statistics, individual token positions within pools, and user positions across different pools.

## Schema

The Graph schema defines three main entities:

- **Pool**: Represents a liquidity pool in the Shoebill protocol.
- **PoolTokenPosition**: Tracks individual token positions within a liquidity pool.
- **UserPosition**: Aggregates all token positions for a user across various pools.

## Getting Started

### Prerequisites

- Node.js
- Yarn (for package management)
- Docker (optional, for running a local Graph node)

### Installation

1. Install dependencies:
    ```bash 
    yarn install
    ```
2. Prepare the subgraph.yaml:
Ensure the contract addresses and start blocks are correct for the network you are deploying to.

3. Generate code:
    ```bash
    graph codegen
    ```
4. Build the subgraph:
    ```bash
    graph build
    ```
## Deployment
To deploy this subgraph to a local Graph node:
    
``` bash 
    graph create --node http://localhost:8020/ your-subgraph-name
    graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 your-subgraph-name
```
To deploy to a hosted service, replace the URLs with the appropriate hosted service endpoints and include your deploy key.

## Configuration Details
- Network: zklink-nova
- Start Block: 727 for the main Shoebill contract.
### Data Sources
The subgraph indexes data from two main sources:

- ShoebillCore: Main contract handling pool operations.
- ShoebillLToken: Contract for liquidity tokens in the pools.
### Event Handlers
- handleMarketListed: Handles the MarketListed event for tracking newly listed markets.
- handleTransfer: Monitors the Transfer events for liquidity tokens.

## Contributing
Contributions to this subgraph are welcome. Please ensure that you adhere to standard coding practices and submit pull requests for any enhancements.

## License
This project is licensed under the MIT License.
