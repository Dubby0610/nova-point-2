import { Address } from '@graphprotocol/graph-ts';
import { Deposit, Withdraw } from '../../generated/templates/Multipool/Multipool';
import { getMultipool } from '../helpers/multipool/get-multipool';
import { getOrCreateMultipoolPosition } from '../helpers/multipool/get-or-create-multipool-position';
import { getWlpBalance } from '../helpers/multipool/get-wlp-balance';

export function handleDeposit(event: Deposit): void{
    const multipool = getMultipool(event.address);
    if (!multipool) return;

    const position = getOrCreateMultipoolPosition(event.params.recipient, multipool);
    const balance = getWlpBalance(event.params.recipient, Address.fromString(multipool.multipoolToken));

    position.balance = balance;
    position.save();
}

export function handleWithdraw(event: Withdraw): void{
    const multipool = getMultipool(event.address);
    if (!multipool) return;

    const position = getOrCreateMultipoolPosition(event.params.recipient, multipool);
    const balance = getWlpBalance(event.params.recipient, Address.fromString(multipool.multipoolToken));

    position.balance = balance;
    position.save();
}