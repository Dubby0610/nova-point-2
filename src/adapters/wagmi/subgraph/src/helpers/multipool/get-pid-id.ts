import { Address, BigInt } from '@graphprotocol/graph-ts';
import { MultipoolDispatcher } from '../../../generated/FactoryMultipool/MultipoolDispatcher';
import { MULTIPOOL_DISPATCHER_ADDRESS } from '../../constants';
import { BIGINT_ZERO, BIGINT_ONE } from '../../constants';

export function getPidId(multipoolAddress: Address): BigInt {
    const dispatcher = MultipoolDispatcher.bind(MULTIPOOL_DISPATCHER_ADDRESS); 
    const poolLength = dispatcher.poolLength();
    let pid = BIGINT_ZERO;
    for (let i = BIGINT_ZERO; i < poolLength; i = i.plus(BIGINT_ONE)) {
        if (dispatcher.poolInfo(i).getMultipool().equals(multipoolAddress)) {
            pid = i;
            break;
        }
    }
    return pid;
}