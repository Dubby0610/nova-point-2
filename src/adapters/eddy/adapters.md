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
Eddy Finance is a decentralized exchange (DEX) designed to make it effortless to move assets across different blockchains, like BTC and EVM networks. By leveraging Eddy Finance’s Omni-chain pools that aggregate native assets like ETH, BTC, and MATIC into a single pool, users can engage exclusively with native assets, mitigating the risks associated with wrapped assets.

2. User Points Calculation Criteria:
Users performing swaps on the below contract for any token on Eddy finance dApp (https://app.eddy.finance/swap) on zklink network would be eligible for zklink points
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