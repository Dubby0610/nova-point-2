**NOTE**

### Please enable "Allow edits by maintainers" while putting up the PR.
____

## Type of change
- [ ] New adapters
- [ ] Adapter-related bug fix
<!-- Description: description of the bug and fix -->
Description:

___

### Description

Please provide the following information based on the type of points calculation:

#### For TVL Points Calculation:

1. Dapp Description:
   <!-- Description of the Dapp: Staking, liquidity provision, lending, etc. -->

2. Criteria for Calculating User Points:
   <!-- Condition for users to earn points: e.g., Users staking lpUSDT in the xxx contract will earn points. -->

3. Collateral Asset Locking Contract:
   <!-- Contract where all assets (e.g., USDT) are locked, to facilitate auditing of collateral TVL.  e.g., The vault contract address is 0x2bd... -->
   > **Note**: If there are multiple `tokenAddress`, please specify which contracts the different `tokenAddress` are locked in.

5. LP Contract:
   <!-- Contract to verify the user's LP percentage against all users' LPs. e.g., `0x390...b2f` or the poolAddresses in csv -->
   > **Note**: User balance is calculated as LP percentage multiplied by total collateral.

#### For Volume/Transaction Points Calculation:

1. Dapp Description:
   <!-- Description of the Dapp: Staking, liquidity provision, lending, etc. -->

2. User Points Calculation Criteria:
   <!-- Condition for users to earn points: e.g., Users performing swaps in the xxx contract will earn points. -->

3. Solidity Contract Signature Involved in Transactions:
   <!-- Provide the Solidity contract event signature, e.g.,  ```solidity
   Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)
   ``` -->

4. Conditions for User Points Calculation:
   <!-- Condition for users to earn points: e.g., Users triggering the Swap event in the xxx contract will earn points. -->

5. Quantity Calculation Rule:
   <!-- Explain how the quantity is calculated based on the event signature, indicating which value it corresponds to, e.g., it is the value of `amount0In`. -->

