import { Address } from '@graphprotocol/graph-ts';
import { Multipool } from '../../../generated/FactoryMultipool/Multipool';

export const getMultipoolToken = (multipoolAddress: Address): Address => {
    const contract = Multipool.bind(multipoolAddress);
    return contract.multipoolToken();
};
