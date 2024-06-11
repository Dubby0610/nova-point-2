import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { Pool, Token } from '../../../generated/schema';
import { Pool as PoolTemplate } from '../../../generated/templates';
import { BIGDECIMAL_ZERO, BIGINT_ZERO } from '../../constants';

export function createPool(address: Address, token0: Token, token1: Token, fee: i32, block: ethereum.Block): Pool {
    const pool = new Pool(address.toHexString());
    pool.token0 = token0.id;
    pool.token1 = token1.id;
    pool.feeTier = BigInt.fromI32(fee);
    pool.liquidity = BIGINT_ZERO;
    pool.token0Price = BIGDECIMAL_ZERO;
    pool.token1Price = BIGDECIMAL_ZERO;
    pool.totalValueLockedToken0 = BIGDECIMAL_ZERO;
    pool.totalValueLockedToken1 = BIGDECIMAL_ZERO;
    pool.sqrtPrice = BIGINT_ZERO;
    pool.save();

    PoolTemplate.create(address);
    return pool;
}
