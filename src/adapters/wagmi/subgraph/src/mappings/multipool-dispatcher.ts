import { Deposit, Withdraw } from '../../generated/MultipoolDispatcher/MultipoolDispatcher';
import { getPoolInfo } from '../helpers/multipool/get-pool-info';
import { getMultipool } from '../helpers/multipool/get-multipool';
import { getOrCreateMultipoolPosition } from '../helpers/multipool/get-or-create-multipool-position';

export function handleDeposit(event: Deposit): void {
    const poolInfo = getPoolInfo(event.params.pid);
    const multipool = getMultipool(poolInfo.getMultipool());
    if (!multipool) return;

    const position = getOrCreateMultipoolPosition(event.params.user, multipool);

    position.staked = position.staked.plus(event.params.amount);
    position.save();
}

export function handleWithdraw(event: Withdraw): void{
    const poolInfo = getPoolInfo(event.params.pid);
    const multipool = getMultipool(poolInfo.getMultipool());
    if (!multipool) return;

    const position = getOrCreateMultipoolPosition(event.params.user, multipool);

    position.staked = position.staked.minus(event.params.amount);
    position.save();
}