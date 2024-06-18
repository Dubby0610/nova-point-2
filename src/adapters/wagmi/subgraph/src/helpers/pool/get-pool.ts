import { Pool } from '../../../generated/schema';
import { Address, log } from '@graphprotocol/graph-ts';

export function getPool(address: Address): Pool | null {
    const pool = Pool.load(address.toHexString());
    if (pool) return pool;
    log.error('Cannot find pool', [address.toHexString()]);
    return null;
}
