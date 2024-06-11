import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Bundle, Pool, Token } from "../../generated/schema";
import { BIGDECIMAL_ONE, BIGDECIMAL_ZERO, BIGINT_ZERO, NATIVE_ORACLE_ADDRESS, STABLE_COINS_ADDRESSES, WRAPPED_NATIVE_ADDRESS } from "../constants";
import { convertTokenToDecimal, safeDiv } from "./index";
import { Oracle } from '../../generated/templates/Pool/Oracle'

function getMinimumEthLocked(): BigDecimal {
    return BigDecimal.fromString("5");
}

export function getEthPriceInUSD(): BigDecimal {
    const oracleContract = Oracle.bind(Address.fromString(NATIVE_ORACLE_ADDRESS));
    const peek = oracleContract.try_latestAnswer();
    if (peek.reverted) return BIGDECIMAL_ZERO;
    return convertTokenToDecimal(peek.value, BigInt.fromI32(8))
}

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token): BigDecimal {
    if (token.id.toLowerCase() == WRAPPED_NATIVE_ADDRESS.toLowerCase()) {
        return BIGDECIMAL_ONE;
    }
    const stablecoins = STABLE_COINS_ADDRESSES;
    const bundle = Bundle.load('1')!;

    if (stablecoins.includes(token.id.toLowerCase())) {
        return safeDiv(BIGDECIMAL_ONE, bundle.ethPriceUSD);
    }

    const whiteList = token.whitelistPools;
    // for now just take USD from pool with greatest TVL
    // need to update this to actually detect best rate based on liquidity distribution
    let largestLiquidityETH = BIGDECIMAL_ZERO;
    let priceSoFar = BIGDECIMAL_ZERO;

    for (let i = 0; i < whiteList.length; ++i) {
        let poolAddress = whiteList[i];
        let pool = Pool.load(poolAddress)!;

        if (pool.liquidity.gt(BIGINT_ZERO)) {
            if (pool.token0 == token.id) {
                // whitelist token is token1
                let token1 = Token.load(pool.token1)!;
                // get the derived ETH in pool
                let ethLocked = pool.totalValueLockedToken1.times(token1.derivedETH);
                if (ethLocked.gt(largestLiquidityETH) && ethLocked.gt(getMinimumEthLocked())) {
                    largestLiquidityETH = ethLocked;
                    // token1 per our token * Eth per token1
                    priceSoFar = pool.token1Price.times(token1.derivedETH as BigDecimal);
                }
            }
            if (pool.token1 == token.id) {
                let token0 = Token.load(pool.token0)!;
                // get the derived ETH in pool
                let ethLocked = pool.totalValueLockedToken0.times(token0.derivedETH);
                if (ethLocked.gt(largestLiquidityETH) && ethLocked.gt(getMinimumEthLocked())) {
                    largestLiquidityETH = ethLocked;
                    // token0 per our token * ETH per token0
                    priceSoFar = pool.token0Price.times(token0.derivedETH as BigDecimal);
                }
            }
        }
    }

    return priceSoFar; // nothing was found return 0
}