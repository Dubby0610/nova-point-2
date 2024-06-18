import { Multipool } from '../../../generated/schema';
import { Address, log } from '@graphprotocol/graph-ts';

export function getMultipool(address: Address): Multipool | null {
    const multipool = Multipool.load(address.toHexString());
    if (multipool) return multipool;
    log.error(`Cannot find multipool - ${address.toHexString()}`, []);
    return null;
}
