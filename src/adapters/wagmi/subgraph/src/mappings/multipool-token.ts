import { Transfer } from '../../generated/templates/MultipoolToken/ERC20';
import { ADDRESS_ZERO, MULTIPOOL_DISPATCHER_ADDRESS } from '../constants';
import { getOrCreateToken } from '../helpers/token/get-or-create-token';
import { getOrCreateMultipoolPosition } from '../helpers/multipool/get-or-create-multipool-position';
import { getMultipool } from '../helpers/multipool/get-multipool';
import { Address } from '@graphprotocol/graph-ts';
import { getWlpBalance } from '../helpers/multipool/get-wlp-balance';

export function handleTransfer(event: Transfer): void {
    const addresses = [MULTIPOOL_DISPATCHER_ADDRESS.toHexString(), ADDRESS_ZERO.toHexString()];
    if(addresses.includes(event.params.from.toHexString()) || addresses.includes(event.params.to.toHexString())) return;
    const token = getOrCreateToken(event.address);

    if(!token.multipool) return;

    const multipool = getMultipool(Address.fromString(token.multipool!));
    if(!multipool) return;

    const users = [event.params.from, event.params.to];
    for(let i = 0; i < users.length; i++){
        const position = getOrCreateMultipoolPosition(users[i], multipool);
        position.balance = getWlpBalance(users[i], event.address);
        position.save();
    }
}