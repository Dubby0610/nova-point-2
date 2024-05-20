```
**NOTE**

### Please enable "Allow edits by maintainers" while putting up the PR.
____

## Type of change
- [x] New adapters
- [ ] Adapter-related bug fix
<!-- Description: description of the bug and fix -->
Description:

___

### Description

Please provide the following information based on the type of points calculation:

#### For Volume/Transaction Points Calculation:

1. Dapp Description:
   trade game.

2. User Points Calculation Criteria:
   0.5 points per transaction.

3. Solidity Contract Signature Involved in Transactions:
   OrderPlaced(bool isGreater, address guesser, uint256 nonce, uint256 amount, uint256 guessPrice);

4. Conditions for User Points Calculation:
   Users triggering the Swap event in the 0xD06B5A208b736656A8F9cD04ed43744C738BD8A9 contract will earn 0.5 points.

5. Quantity Calculation Rule:
    it is the value of `amount`
```
