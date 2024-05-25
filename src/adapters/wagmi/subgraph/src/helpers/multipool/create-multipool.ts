import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Multipool, Token } from '../../../generated/schema';
import { Multipool as MultipoolTemplate } from '../../../generated/templates';

export function createMultipool(token0: Token, token1: Token, multipoolAddress: Address, multipoolToken: Address, pidId: BigInt): Multipool {
    const multipool = new Multipool(multipoolAddress.toHexString());
    multipool.token0 = token0.id;
    multipool.token1 = token1.id;
    multipool.multipoolToken = multipoolToken.toHexString();
    multipool.pidId = pidId;

    multipool.save();

    MultipoolTemplate.create(multipoolAddress);

    return multipool;
}
