/* eslint-disable prefer-const */
import { BigInt, BigDecimal, Bytes } from '@graphprotocol/graph-ts';
import { ONE_BI, ZERO_BI, ZERO_BD, ONE_BD } from './constants';

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let bd = BigDecimal.fromString('1');
    for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
        bd = bd.times(BigDecimal.fromString('10'));
    }
    return bd;
}

// return 0 if denominator is 0 in division
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
    if (amount1.equals(ZERO_BD)) {
        return ZERO_BD;
    } else {
        return amount0.div(amount1);
    }
}

export function bigDecimalExponated(value: BigDecimal, power: BigInt): BigDecimal {
    if (power.equals(ZERO_BI)) {
        return ONE_BD;
    }
    let negativePower = power.lt(ZERO_BI);
    let result = ZERO_BD.plus(value);
    let powerAbs = power.abs();
    for (let i = ONE_BI; i.lt(powerAbs); i = i.plus(ONE_BI)) {
        result = result.times(value);
    }

    if (negativePower) {
        result = safeDiv(ONE_BD, result);
    }

    return result;
}

export function tokenAmountToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
    if (exchangeDecimals == ZERO_BI) {
        return tokenAmount.toBigDecimal();
    }
    return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function priceToDecimal(amount: BigDecimal, exchangeDecimals: BigInt): BigDecimal {
    if (exchangeDecimals == ZERO_BI) {
        return amount;
    }
    return safeDiv(amount, exponentToBigDecimal(exchangeDecimals));
}

export function equalToZero(value: BigDecimal): boolean {
    const formattedVal = parseFloat(value.toString());
    const zero = parseFloat(ZERO_BD.toString());
    if (zero == formattedVal) {
        return true;
    }
    return false;
}

export function isNullEthValue(value: string): boolean {
    return value == '0x0000000000000000000000000000000000000000000000000000000000000001';
}

export function bigDecimalExp18(): BigDecimal {
    return BigDecimal.fromString('1000000000000000000');
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
    if (exchangeDecimals == ZERO_BI) {
        return tokenAmount.toBigDecimal();
    }
    return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function convertEthToDecimal(eth: BigInt): BigDecimal {
    return eth.toBigDecimal().div(exponentToBigDecimal(BigInt.fromI32(18)));
}

export function tick2PriceDecimal(tick: i32, tokenXDecimals: BigInt, tokenYDecimals: BigInt): BigDecimal {
    // (1.0001 ** tick) * (10 ** tokenXDecimals / 10 ** tokenYDecimals)
    return bigDecimalExponated(BigDecimal.fromString('1.0001'), BigInt.fromI32(tick)).times(
        exponentToBigDecimal(tokenXDecimals).div(exponentToBigDecimal(tokenYDecimals))
    );
}

export function convertFeeNumber(feeTier: BigInt): BigDecimal {
    return feeTier.toBigDecimal().div(BigDecimal.fromString('1000000'));
}

export function bigEndianBytesToBigInt(bytes: Bytes): BigInt {
    let zeroBytesLen = 0;
    for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] != 0) {
            zeroBytesLen = i;
            break;
        }
    }
    const bytesLen = bytes.length - zeroBytesLen;
    let signedBytes = new BigInt(bytesLen + 1);
    for (let i = 0; i < bytesLen; i++) {
        signedBytes[i] = bytes[bytes.length - 1 - i];
    }
    signedBytes[bytesLen] = 0;
    return signedBytes;
}

export function topicToAddress(bytes: Bytes): string {
    return '0x' + bytes.toHexString().substr(26);
}

export function calculatetTick2PriceDecimal(tick: i32, tokenXDecimals: BigInt, tokenYDecimals: BigInt): BigDecimal {
    let xDecimals = bigIntToNumber(tokenXDecimals);
    let yDecimals = bigIntToNumber(tokenYDecimals);

    let base = 1.0001;
    let powResult = Math.pow(base, tick); // 1.0001 ** tick
    let mulDivResult = Math.pow(10, xDecimals) / Math.pow(10, yDecimals); // 10 ** tokenXDecimals / 10 ** tokenYDecimals

    let result = BigDecimal.fromString((powResult * mulDivResult).toString());

    return result;
}

export function bigIntToNumber(bigIntValue: BigInt): number {
    return parseFloat(bigIntValue.toString());
}