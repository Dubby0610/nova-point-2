import { Address } from '@graphprotocol/graph-ts';
import { ERC20 } from '../../../generated/Factory/ERC20';
import { ERC20SymbolBytes } from '../../../generated/Factory/ERC20SymbolBytes';
import { UNKNOWN_TOKEN_VALUE } from '../../constants';
import { isNullEthValue } from '../../utils';

export function getTokenSymbol(address: Address): string {
    const contract = ERC20.bind(address);
    const contractSymbolBytes = ERC20SymbolBytes.bind(address);

    // try types string and bytes32 for symbol
    let symbolValue = UNKNOWN_TOKEN_VALUE;
    let symbolResult = contract.try_symbol();
    if (!symbolResult.reverted) {
        return symbolResult.value;
    }

    // non-standard ERC20 implementation
    let symbolResultBytes = contractSymbolBytes.try_symbol();
    if (!symbolResultBytes.reverted) {
        // for broken pairs that have no symbol function exposed
        if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
            symbolValue = symbolResultBytes.value.toString();
        }
    }

    return symbolValue;
}
