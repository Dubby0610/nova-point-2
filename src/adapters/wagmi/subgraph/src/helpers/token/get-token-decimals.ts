import { Address } from '@graphprotocol/graph-ts';
import { ERC20 } from '../../../generated/Factory/ERC20';
import { INVALID_TOKEN_DECIMALS } from '../../constants';

export function getTokenDecimals(address: Address): i32 {
    const contract = ERC20.bind(address);

    // try types uint8 for decimals
    const decimalResult = contract.try_decimals();
    if (!decimalResult.reverted) {
        return decimalResult.value as i32;
    }

    return INVALID_TOKEN_DECIMALS as i32;
}
