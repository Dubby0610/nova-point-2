import { Address, BigInt } from "@graphprotocol/graph-ts";
import { getOrCreateBundle } from "../helpers/get-or-create-bundle";
import { getPool } from "../helpers/pool/get-pool";
import { getOrCreateToken } from "../helpers/token/get-or-create-token";
import { Swap, Token } from '../../generated/schema';
import { Swap as SwapEvent, Mint, Burn, Collect, Initialize } from '../../generated/Factory/Pool';
import { convertTokenToDecimal, sqrtPriceX96ToTokenPrices } from "../utils";
import { findEthPerToken, getEthPriceInUSD } from "../utils/pricing";

export function handleInitialize(event: Initialize): void{
    const pool = getPool(event.address);
    if (!pool) return;

    pool.sqrtPrice = event.params.sqrtPriceX96;
    pool.tick = BigInt.fromI32(event.params.tick);
    pool.save();

    const token0 = getOrCreateToken(Address.fromString(pool.token0));
    const token1 = getOrCreateToken(Address.fromString(pool.token1));

    // update ETH price now that prices could have changed
    const bundle = getOrCreateBundle();
    bundle.ethPriceUSD = getEthPriceInUSD();
    bundle.save();

    // update token prices
    token0.derivedETH = findEthPerToken(token0 as Token);
    token1.derivedETH = findEthPerToken(token1 as Token);
    token0.save();
    token1.save();
}

export function handleSwap(event: SwapEvent): void {
    const bundle = getOrCreateBundle();
    const pool = getPool(event.address);
    if (!pool) return;

    const token0 = getOrCreateToken(Address.fromString(pool.token0));
    const token1 = getOrCreateToken(Address.fromString(pool.token1));

    // amounts - 0/1 are token deltas: can be positive or negative
    const amount0 = convertTokenToDecimal(event.params.amount0, BigInt.fromI32(token0.decimals));
    const amount1 = convertTokenToDecimal(event.params.amount1, BigInt.fromI32(token1.decimals));

    // Update the pool with the new active liquidity, price, and tick.
    pool.liquidity = event.params.liquidity;
    pool.tick = BigInt.fromI32(event.params.tick as i32);
    pool.sqrtPrice = event.params.sqrtPriceX96;
    pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0);
    pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1);

    // updated pool ratess
    let prices = sqrtPriceX96ToTokenPrices(pool.sqrtPrice, token0.decimals, token1.decimals);
    pool.token0Price = prices[0];
    pool.token1Price = prices[1];
    pool.save();

    // update USD pricing
    bundle.ethPriceUSD = getEthPriceInUSD();
    bundle.save();
    token0.derivedETH = findEthPerToken(token0 as Token);
    token1.derivedETH = findEthPerToken(token1 as Token);

    const swap = new Swap(event.transaction.hash.toHexString());
    swap.timestamp = event.block.timestamp;
    swap.pool = pool.id;
    swap.token0 = pool.token0;
    swap.token1 = pool.token1;
    swap.origin = event.transaction.from.toHexString();
    swap.amount0 = amount0;
    swap.amount1 = amount1;
    swap.logIndex = event.logIndex;
    swap.blockNumber = event.block.number;
    swap.price0 = token0.derivedETH.times(bundle.ethPriceUSD);
    swap.price1 = token1.derivedETH.times(bundle.ethPriceUSD);

    
    swap.save();
    pool.save();
    token0.save();
    token1.save();
}

export function handleMint(event: Mint): void {
    const pool = getPool(event.address);
    if (!pool) return;

    const token0 = getOrCreateToken(Address.fromString(pool.token0));
    const token1 = getOrCreateToken(Address.fromString(pool.token1));

    const amount0 = convertTokenToDecimal(event.params.amount0, BigInt.fromI32(token0.decimals));
    const amount1 = convertTokenToDecimal(event.params.amount1, BigInt.fromI32(token1.decimals));

    if (pool.tick !== null && BigInt.fromI32(event.params.tickLower).le(pool.tick as BigInt) && BigInt.fromI32(event.params.tickUpper).gt(pool.tick as BigInt)) {
        pool.liquidity = pool.liquidity.plus(event.params.amount);
    }

    pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0);
    pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1);

    pool.save();
}

export function handleBurn(event: Burn): void {
    const pool = getPool(event.address);
    if (!pool) return;
    
    // Pools liquidity tracks the currently active liquidity given pools current tick.
    // We only want to update it on burn if the position being burnt includes the current tick.
    if (pool.tick !== null && BigInt.fromI32(event.params.tickLower).le(pool.tick as BigInt) && BigInt.fromI32(event.params.tickUpper).gt(pool.tick as BigInt)) {
        pool.liquidity = pool.liquidity.minus(event.params.amount);
    }

    pool.save();
}

export function handleCollect(event: Collect): void {
    const pool = getPool(event.address);
    if (!pool) return;

    const token0 = getOrCreateToken(Address.fromString(pool.token0));
    const token1 = getOrCreateToken(Address.fromString(pool.token1));

    const amount0 = convertTokenToDecimal(event.params.amount0, BigInt.fromI32(token0.decimals));
    const amount1 = convertTokenToDecimal(event.params.amount1, BigInt.fromI32(token1.decimals));

    pool.totalValueLockedToken0 = pool.totalValueLockedToken0.minus(amount0);
    pool.totalValueLockedToken1 = pool.totalValueLockedToken1.minus(amount1);

    pool.save();
}