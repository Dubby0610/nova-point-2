import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BIGDECIMAL_ZERO, BIGINT_ONE, BIGINT_ZERO, Q192 } from "../constants";

export function isNullEthValue(value: string): boolean {
    return value == '0x0000000000000000000000000000000000000000000000000000000000000001';
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let bd = BigDecimal.fromString('1');
    for (let i = BIGINT_ZERO; i.lt(decimals as BigInt); i = i.plus(BIGINT_ONE)) {
        bd = bd.times(BigDecimal.fromString('10'));
    }
    return bd;
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
    if (exchangeDecimals == BIGINT_ONE) {
        return tokenAmount.toBigDecimal();
    }
    return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
    if (amount1.equals(BIGDECIMAL_ZERO)) {
        return BIGDECIMAL_ZERO;
    } else {
        return amount0.div(amount1);
    }
}

export function sqrtPriceX96ToTokenPrices(sqrtPriceX96: BigInt, token0Decimals: i32, token1Decimals: i32): BigDecimal[] {
    const num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal();
    const denom = BigDecimal.fromString(Q192.toString());
    const price1 = num
        .div(denom)
        .times(exponentToBigDecimal(BigInt.fromI32(token0Decimals)))
        .div(exponentToBigDecimal(BigInt.fromI32(token1Decimals)));

    const price0 = safeDiv(BigDecimal.fromString('1'), price1);
    return [price0, price1];
}