import { utils } from "ethers";
const booster = {
    layerbank: {
        "0x000000000000000000000000000000000000800A": 10, // ETH 0xb666582f612692525c4027d2a8280ac06a055a95
        "0xda4aaed3a53962c83b35697cd138cc6df43af71f": 10, // WBTC 0x5aa48b2dfd3fd7cf1a3374ae1b0cce54329e4bcf
        "0x2F8A25ac62179B31D62D7F80884AE57464699059": 10, // USDT 0x245fb442f811f02d27bdebdef23ed30810570aae
        "0x1a1A3b2ff016332e866787B311fcB63928464509": 10, // USDC 0xe00c509c4a54b8b775ea5643f48de366a074b114
        "0x1B49eCf1A8323Db4abf48b2F5EFaA33F7DdAB3FC": 4, // pufETH.eth 0xdd6105865380984716c6b2a1591f9643e6ed1c48
        "0xF5d3953a33F78E0412A8988FD77B4920AA968B0b": 4, // Manta.manta 0x9f4baa696954ea954090231a582d535854b1b40e
        "0xDeEC33dc735Baf36b473598C33BCD077A0f32049": 4, // Stone.manta 0x8c4ba925d899ccde6d3657fcd9416c819edbef97
        "0xEbc45Ef3B6D7E31573DAa9BE81825624725939f9": 4, // wBTC.eth 0xa04c6c48f32abe11298e9228e7b34289a0068236
        "0x85D431A3a56FDf2d2970635fF627f386b4ae49CC": 2, // M-BTC 0x62681d33f1440F47c668905E9660a7e5da32C845
        "0xbEAf16cFD8eFe0FC97C2a07E349B9411F5dC272C": 2, // solvBTC 0x24bCF64b02fB00b8160351AD117C2A359584eb08
        "0xFb8dBdc644eb54dAe0D7A9757f1e6444a07F8067": 2  // "BTCT" 0xe6052ce0B230e17CAeabAB46cb2777ED3dC855Db
    },
    aqua: {
        "0x8280a4e7D5B3B658ec4580d3Bc30f5e50454F169": 10, // WETH 0x9e5cabd99dfb4e4a0c3ea6fe9c3e1a4ce4f5fce5
        "0xDa4AaEd3A53962c83B35697Cd138cc6df43aF71f": 10, // wBTC 0x97a96711ba21a10bcc5fa75809c2acbb9dd0a1d4
        "0x2F8A25ac62179B31D62D7F80884AE57464699059": 10, // USDT 0x0f6fc293ab973962f9172489f492514bc43fba81
        "0x1a1A3b2ff016332e866787B311fcB63928464509": 10, // USDC 0x603871a4ddea08b9375ff6339e319ae7932b640b
        "0x1B49eCf1A8323Db4abf48b2F5EFaA33F7DdAB3FC": 4, // pufETH.eth 0xc2be3cc06ab964f9e22e492414399dc4a58f96d3
        "0x86339D32837345974609C66c52884FcB26a76b8C": 4, // wMNT 0x85f1858Da8ae9447e4Bb1b6721b4abCacFCde1c7
        "0xF5d3953a33F78E0412A8988FD77B4920AA968B0b": 4, // Manta.manta 0x069fde3a1439d39ba2eef51559ba7006003a4853
        "0xDeEC33dc735Baf36b473598C33BCD077A0f32049": 4, // Stone.manta 0xa5b104e55d42f41ca1dbbb3ee95c62092c04b8f4
        "0xEA45e49428EB47E4f6F052148B23E8feC61d4Cad": 4, // Stone.eth
        "0xcb70533c9635060275F1A97539dda2E3f8bFac42": 4, // ARB.ARB 0x78136b2fbffdf2df6261990eec49dbd76ca63c8f
        "0x829a939ee105Cc3607428c237E463fEb051E9780": 4, // wUSDM.manta 0x1274c609d81959da5014288e9ff8d22b6a781452
        "0xfe8C940B936E3520e314574418585687c3BbAA12": 4, // wstETH.eth
        "0x186c0c42C617f1Ce65C4f7DF31842eD7C5fD8260": 4, // rsETH.eth
    },
    izumi: {
        "0x8280a4e7D5B3B658ec4580d3Bc30f5e50454F169": 10, // WETH
        "0x2F8A25ac62179B31D62D7F80884AE57464699059": 10, // USDT
        "0x1a1A3b2ff016332e866787B311fcB63928464509": 10, // USDC
        "0xbEAf16cFD8eFe0FC97C2a07E349B9411F5dC272C": 3,  // solvBTC
    },
    interport: {
        "0x2F8A25ac62179B31D62D7F80884AE57464699059": 10, // USDT
        "0x1a1A3b2ff016332e866787B311fcB63928464509": 10, // USDC
    }
} as const;

const normalizeTokenBooster = (config: any) => {
    const newConfig: any = {};
    for (const key in config) {
        if (config.hasOwnProperty(key)) {
            newConfig[key] = {};
            for (const address in config[key]) {
                if (config[key].hasOwnProperty(address)) {
                    try {
                        const normalizedAddress = utils.getAddress(address);
                        newConfig[key][normalizedAddress] = config[key][address];
                    } catch (error) {
                        console.error(`Invalid address: ${address}`);
                    }
                }
            }
        }
    }
    return newConfig;
};

export const tokenBooster = normalizeTokenBooster(booster)
