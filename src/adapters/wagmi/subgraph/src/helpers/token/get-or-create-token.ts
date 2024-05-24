import { Address } from '@graphprotocol/graph-ts';
import { Token } from '../../../generated/schema';
import { BIGDECIMAL_ZERO } from '../../constants';
import { getTokenDecimals } from './get-token-decimals';
import { getTokenName } from './get-token-name';
import { getTokenSymbol } from './get-token-symbol';

export function getOrCreateToken(address: Address): Token {
    let token = Token.load(address.toHexString());
    if (!token) {
        token = new Token(address.toHexString());
        token.symbol = getTokenSymbol(address);
        token.name = getTokenName(address);
        token.decimals = getTokenDecimals(address);
        token.derivedETH = BIGDECIMAL_ZERO;
        token.whitelistPools = [];
        token.save();
    }
    return token;
}
