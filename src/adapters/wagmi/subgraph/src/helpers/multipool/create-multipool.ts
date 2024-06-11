import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Multipool, Token } from '../../../generated/schema';
import { Multipool as MultipoolTemplate, MultipoolToken } from '../../../generated/templates';

export function createMultipool(token0: Token, token1: Token, multipoolAddress: Address, multipoolToken: Token, pidId: BigInt): Multipool {
    const multipool = new Multipool(multipoolAddress.toHexString());
    multipool.token0 = token0.id;
    multipool.token1 = token1.id;
    multipool.multipoolToken = multipoolToken.id;
    multipool.pidId = pidId;

    multipool.save();

    MultipoolTemplate.create(multipoolAddress);
    MultipoolToken.create(Address.fromString(multipoolToken.id));

    multipoolToken.multipool = multipool.id;
    multipoolToken.save();

    return multipool;
}
