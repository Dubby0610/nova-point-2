import { CreateMultipool } from '../../generated/FactoryMultipool/FactoryMultipool';
import { createMultipool } from '../helpers/multipool/create-multipool';
import { getMultipoolToken } from '../helpers/multipool/get-multipool-token';
import { getPidId } from '../helpers/multipool/get-pid-id';
import { getOrCreateToken } from '../helpers/token/get-or-create-token';

export function handleMultiPoolCreated(event: CreateMultipool): void{
    const token0 = getOrCreateToken(event.params.token0);
    const token1 = getOrCreateToken(event.params.token1);

    const multipoolTokenAddress = getMultipoolToken(event.params.multipool);
    const multipoolToken = getOrCreateToken(multipoolTokenAddress);

    const pidId = getPidId(event.params.multipool);
    createMultipool(token0, token1, event.params.multipool, multipoolToken, pidId);
}