import { Address, BigInt } from '@graphprotocol/graph-ts';
import { ERC20 } from '../../generated/agx-swap/ERC20'
import { ERC20BytesMethod } from '../../generated/agx-swap/ERC20BytesMethod';

function isNullEthValue(value: string): boolean {
    return value == '0x0000000000000000000000000000000000000000000000000000000000000001';
}

export function fetchTokenSymbol(tokenAddress: Address): string {
    const contract = ERC20.bind(tokenAddress);

    // try types string and bytes32 for symbol
    let symbolValue = 'unknown';
    const symbolResult = contract.try_symbol();
    if (symbolResult.reverted) {
        const contractSymbolBytes = ERC20BytesMethod.bind(tokenAddress);
        const symbolResultBytes = contractSymbolBytes.try_symbol();
        if (!symbolResultBytes.reverted) {
            // for broken pairs that have no symbol function exposed
            if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
                symbolValue = symbolResultBytes.value.toString();
            }
        } else {
            return "ETH"
        }
    } else {
        symbolValue = symbolResult.value;
    }

    return symbolValue;
}

export function fetchTokenName(tokenAddress: Address): string {
    const contract = ERC20.bind(tokenAddress);

    // try types string and bytes32 for name
    let nameValue = 'unknown';
    const nameResult = contract.try_name();
    if (nameResult.reverted) {
        const contractNameBytes = ERC20BytesMethod.bind(tokenAddress);
        const nameResultBytes = contractNameBytes.try_name();
        if (!nameResultBytes.reverted) {
            // for broken pairs that have no name function exposed
            if (!isNullEthValue(nameResultBytes.value.toHexString())) {
                nameValue = nameResultBytes.value.toString();
            }
        } else {
            return ''
        }
    } else {
        nameValue = nameResult.value;
    }

    return nameValue;
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
    const contract = ERC20.bind(tokenAddress);
    const totalSupplyResult = contract.try_totalSupply();
    return totalSupplyResult.value;
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
    let contract = ERC20.bind(tokenAddress);
    // try types uint8 for decimals
    const decimalResult = contract.try_decimals();
    if (!decimalResult.reverted) {
        return BigInt.fromI32(decimalResult.value);
    }
    return BigInt.fromString('18');
}

export function fetchTokenBalanceAmount(tokenAddress: string, ownerAddress: string): BigInt {
    let contract = ERC20.bind(Address.fromString(tokenAddress));
    const balance = contract.try_balanceOf(Address.fromString(ownerAddress));
    if (!balance.reverted) {
        return balance.value;
    }
    return BigInt.zero()
}

