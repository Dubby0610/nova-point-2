import { tokenBooster } from "./tokenBooster";

export type NetworkKey = string;
export default () => {
    const {
        PORT,
        ENABLE_TOKEN_OFFCHAIN_DATA_SAVER,
        UPDATE_TOKEN_OFFCHAIN_DATA_INTERVAL,
        SELECTED_TOKEN_OFFCHAIN_DATA_PROVIDER,
        COINGECKO_IS_PRO_PLAN,
        COINGECKO_API_KEY,
        POINTS_STATISTICAL_PERIOD_SECS,
        POINTS_PHASE1_START_TIME,
        POINTS_CANCEL_DEPOSIT_START_TIME,
        POINTS_EARLY_DEPOSIT_END_TIME,
        POINTS_PHASE1_END_TIME,
        POINTS_STATISTICS_TVL_INTERVAL,
        ADAPTER_INTERVAL,
        START_BLOCK,
    } = process.env;

    return {
        port: parseInt(PORT, 10) || 3001,
        adapterInterval: parseInt(ADAPTER_INTERVAL, 10) || 3600,
        startBlock: parseInt(START_BLOCK, 10) || 600000,
        tokenBooster: tokenBooster,
        tokens: {
            enableTokenOffChainDataSaver: ENABLE_TOKEN_OFFCHAIN_DATA_SAVER === "true",
            updateTokenOffChainDataInterval: parseInt(UPDATE_TOKEN_OFFCHAIN_DATA_INTERVAL, 10) || 86_400_000,
            tokenOffChainDataProviders: ["coingecko", "portalsFi"],
            selectedTokenOffChainDataProvider: SELECTED_TOKEN_OFFCHAIN_DATA_PROVIDER || "coingecko",
            coingecko: {
                isProPlan: COINGECKO_IS_PRO_PLAN === "true",
                apiKey: COINGECKO_API_KEY,
            },
        },
        points: {
            pointsStatisticalPeriodSecs: parseInt(POINTS_STATISTICAL_PERIOD_SECS, 10) || 3600,
            pointsPhase1StartTime: POINTS_PHASE1_START_TIME,
            pointsCancelDepositStartTime: POINTS_CANCEL_DEPOSIT_START_TIME,
            pointsPhase1EndTime: POINTS_PHASE1_END_TIME,
            pointsEarlyDepositEndTime: POINTS_EARLY_DEPOSIT_END_TIME,
            pointsStatistsTvlInterval: POINTS_STATISTICS_TVL_INTERVAL,
        },
    };
};
