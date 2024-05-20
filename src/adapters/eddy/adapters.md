**NOTE**

### Please enable "Allow edits by maintainers" while putting up the PR.
____

## Type of change
- [x] New adapters
- [ ] Adapter-related bug fix
___

### Description

Please provide the following information based on the type of points calculation:

#### For Volume/Transaction Points Calculation:

1. Dapp Description:

Eddy Finance is an OmniChain DEX with a focus on increasing capital efficiency on zkLink Nova. By seamlessly creating and aggregating AMM, StableSwap, and CLAMM pools, Eddy Finance ensures users access the best prices across a diverse array of assets, all while mitigating slippage.
Moreover, Eddy Finance enables utilised Omnichain Smart Contracts to connect chains natively. This enables users to securely transfer native assets across multiple chains—including Bitcoin, EVM, and Cosmos chains—without the need for cumbersome wrapping, resulting in heightened security, minimal gas fees, and unparalleled throughput.

2. User Points Calculation Criteria:

Users performing swaps on the below contract for any token(all pairs) on Eddy finance dApp (https://app.eddy.finance/swap) on zklink network would be eligible for zklink points
*0x35f998694e553b772e0c22dc9ceb9be0a1bf8528*


3. Solidity Contract Signature Involved in Transactions:
```
    EddySwap(
        address walletAddress,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fees,
        uint256 chainId,
        string indexed aggregator,
        uint256 priceOfTokenIn
    );
```

4. Conditions for User Points Calculation:

Users triggering EddySwap event in the contract *0x35f998694e553b772e0c22dc9ceb9be0a1bf8528* would be eligible for points

5. Quantity Calculation Rule:

    `amountIn` is the amount of tokenInput that user is selling and based on that we calculate the dollar value of the trade.
    We also pass a `priceOfTokenIn` parameter to indicate the unit price of the `tokenIn`.
```
    For e.g User swapped 1ETH -> WBTC on eddy finance
    amountIn = 1e18
    decimals = 18
    priceOfTokenIn = 286949082748

    We divide the priceOfToken by 1e8 for getting the exact dollar value which in this case is 2869.49082748

    amountOfEth = amountIn / decimals = 1

    So, tradingVolume = amountOfEth * price = 1 * 2869.49082748 = $2869.49082748
```