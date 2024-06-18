import {BigDecimal, BigInt} from "@graphprotocol/graph-ts";

export const ETH_ADDRESS = "0x000000000000000000000000000000000000800a";
export const USDC_ADDRESS = "0x1a1a3b2ff016332e866787b311fcb63928464509";

export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)

export function convertDecimal(tokenAmount: BigInt, exchangeDecimals: number): BigDecimal {
    return new BigDecimal(tokenAmount).div(exponentToBigDecimal(BigInt.fromI32(exchangeDecimals)))
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let bd = BigDecimal.fromString('1')
    for (let i = ZERO_BI; i.lt(decimals); i = i.plus(ONE_BI))
        bd = bd.times(BigDecimal.fromString('10'))
    return bd
}