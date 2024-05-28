const WETH = "0x8280a4e7D5B3B658ec4580d3Bc30f5e50454F169";
const PUFF_ETH = "0x1B49eCf1A8323Db4abf48b2F5EFaA33F7DdAB3FC";
const USDC = "0x1a1A3b2ff016332e866787B311fcB63928464509";
const USDT = "0x2F8A25ac62179B31D62D7F80884AE57464699059";
const WBTC = "0xDa4AaEd3A53962c83B35697Cd138cc6df43aF71f";
const NATIVE_ETH = "0x000000000000000000000000000000000000800A";

export const getUserTransactionData = async (startBlock: number, endBlock: number): Promise<any> => {
    console.log(`Get Tx Data From ${startBlock} to ${endBlock}`);

    const EddySwapRouter = "0x35F998694e553B772E0c22dC9CEb9bE0a1Bf8528";

    const query = `query MyQuery {
        eddySwaps(where: {
          blockNumber_gte: ${startBlock},
          blockNumber_lte: ${endBlock}
        }){
          id
          amountIn
          chainId
          priceOfTokenIn
          amountOut
          blockNumber
          blockTimestamp
          tokenIn
          tokenOut
          walletAddress
          fees
          transactionHash
        }
      }`;

    const response = await fetch('http://3.114.68.110:8000/subgraphs/name/eddyfinance-v01Fin', {
            method: 'POST',
            body: JSON.stringify({ query }),
            headers: { 'Content-Type': 'application/json' },
    });

    const { data } = await response.json();

    if (data?.eddySwaps?.length === 0) {
        return []
    }

    const allSwaps = data?.eddySwaps;

    const formattedSwaps = allSwaps.map((eachSwap: any) => {
        const tradingVolume = getTradingVolumeForToken(eachSwap.tokenIn, eachSwap.amountIn, eachSwap.priceOfTokenIn);
        return {
            timestamp: eachSwap.blockTimestamp,
            userAddress: eachSwap.walletAddress,
            contractAddress: EddySwapRouter,
            tokenAddress: eachSwap.tokenIn,
            decimals: getDecimalsForToken(eachSwap.tokenIn),
            price: tradingVolume,
            quantity: eachSwap.amountIn,
            txHash: eachSwap.transactionHash,
            nonce: eachSwap.blockNumber,
            blockNumber: eachSwap.blockNumber
        }
    });

    console.log(formattedSwaps, "Swaps ===>");
    

    return formattedSwaps;
  
};

function getDecimalsForToken(tokenAddress: string): number {

    const tokenSwap = tokenAddress.toLowerCase();

    if (tokenSwap === WETH.toLowerCase()) {
        return 18;
    }

    if (tokenSwap === PUFF_ETH.toLowerCase()) {
        return 18;
    }

    if (tokenSwap === WBTC.toLowerCase()) {
        return 8;
    }

    if (tokenSwap === USDC.toLowerCase()) {
        return 6;
    }

    if (tokenSwap === USDT.toLowerCase()) {
        return 6;
    }

    if (tokenSwap === NATIVE_ETH.toLowerCase()) {
        return 18;
    }

    return 6;
    
  
}

function getTradingVolumeForToken(tokenAddress: string, amount: string, unitPrice: number): number {
    const token = tokenAddress.toLowerCase();

    const decimals = getDecimalsForToken(token);

    const amountOfToken = parseFloat(amount.toString()) / 10**decimals;

    const unitPriceInDollars = unitPrice / 1e8;

    return amountOfToken * unitPriceInDollars;
  
}
  