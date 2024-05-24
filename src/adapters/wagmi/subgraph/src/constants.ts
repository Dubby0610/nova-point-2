import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export const BIGINT_ZERO = BigInt.fromI32(0);
export const BIGINT_ONE = BigInt.fromI32(1);

export const BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export const BIGDECIMAL_ONE = new BigDecimal(BIGINT_ONE);

// Token
export const INVALID_TOKEN_DECIMALS = 0;
export const UNKNOWN_TOKEN_VALUE = 'unknown';
export const DEFAULT_DECIMALS = 18;

export const WHITELIST_TOKEN_ADDRESSES = [
    '0x8280a4e7d5b3b658ec4580d3bc30f5e50454f169', // weth
    '0x1a1a3b2ff016332e866787b311fcb63928464509', // usdc
    '0x2f8a25ac62179b31d62d7f80884ae57464699059', // usdt
    '0xf573fa04a73d5ac442f3dea8741317feaa3cdeab', // dai
    '0xda4aaed3a53962c83b35697cd138cc6df43af71f' // wbtc
];

export const ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000');

export const V3_FACTORY_ADDRESS = '0x6175b648473F1d4c1549aAC3c2d007e7720585e6';

export const Q192 = BigInt.fromI32(2).pow(192); // 2 ** 192;

export const WRAPPED_NATIVE_ADDRESS = '0x8280a4e7D5B3B658ec4580d3Bc30f5e50454F169';

export const STABLE_COINS_ADDRESSES = ['0x2f8a25ac62179b31d62d7f80884ae57464699059'];

export const NATIVE_ORACLE_ADDRESS = '0xdBA32e62e929a7e2Fa65782F812416CA65208E40';