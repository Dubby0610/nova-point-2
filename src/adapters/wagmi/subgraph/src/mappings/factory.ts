import { PoolCreated } from '../../generated/Factory/Factory';
import { WHITELIST_TOKEN_ADDRESSES } from '../constants';
import { createPool } from '../helpers/pool/create-pool';
import { getOrCreateToken } from '../helpers/token/get-or-create-token';

export function handlePoolCreated(event: PoolCreated): void {
    const token0 = getOrCreateToken(event.params.token0);
    const token1 = getOrCreateToken(event.params.token1);

    const pool = createPool(event.params.pool, token0, token1, event.params.fee, event.block);

    // update white listed pools
    if (WHITELIST_TOKEN_ADDRESSES.includes(token0.id.toLowerCase())) {
        let newPools = token1.whitelistPools;
        newPools.push(pool.id);
        token1.whitelistPools = newPools;
    }
    if (WHITELIST_TOKEN_ADDRESSES.includes(token1.id.toLowerCase())) {
        let newPools = token0.whitelistPools;
        newPools.push(pool.id);
        token0.whitelistPools = newPools;
    }

    token0.save();
    token1.save();
}