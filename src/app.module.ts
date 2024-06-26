import { Module, Logger } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { HttpModule, HttpService } from "@nestjs/axios";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import config from "./config/index";
import { HealthModule } from "./health/health.module";
import { AppService } from "./app.service";
import { TokenService } from "./token/token.service";
import { AdapterService } from "./points/adapter.service";
import { TokenOffChainDataProvider } from "./token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { CoingeckoTokenOffChainDataProvider } from "./token/tokenOffChainData/providers/coingecko/coingeckoTokenOffChainDataProvider";
import { PortalsFiTokenOffChainDataProvider } from "./token/tokenOffChainData/providers/portalsFi/portalsFiTokenOffChainDataProvider";
import { TokenOffChainDataSaverService } from "./token/tokenOffChainData/tokenOffChainDataSaver.service";
import { BridgePointService } from "./points/bridgePoint.service";
import { BridgeActiveService } from "./points/bridgeActive.service";
import { TvlPointLinkswapService } from "./points/tvlPointLinkswap.service";
import { RedistributePointService } from "./points/redistributePoint.service";
import { ReferralPointService } from "./points/referralPoints.service";
import {
  BlockRepository,
  TokenRepository,
  TransferRepository,
  BalanceRepository,
  AddressFirstDepositRepository,
  ProjectRepository,
  CacheRepository,
  RedistributeBalanceRepository,
  RedistributeBalanceHistoryRepository,
  UserRepository,
  UserHoldingRepository,
  UserStakedRepository,
  UserWithdrawRepository,
  PointsRepository,
  BlockAddressPointRepository,
  ReferralRepository,
  BlockReferralPointsRepository,
  ReferralPointsRepository,
} from "./repositories";
import {
  Block,
  Token,
  Transfer,
  Balance,
  Referral,
  PointsOfLp,
  BlockAddressPointOfLp,
  BlockAddressPoint,
  BalanceOfLp,
  Project,
  Cache,
  TransactionDataOfPoints,
  RedistributeBalance,
  RedistributeBalanceHistory,
  User,
  UserHolding,
  UserStaked,
  UserWithdraw,
  Point,
  BlockReferralPoints,
  ReferralPoints,
} from "./entities";
import { typeOrmReferModuleOptions, typeOrmLrtModuleOptions, typeOrmExplorerModuleOptions } from "./typeorm.config";
import { RetryDelayProvider } from "./retryDelay.provider";
import { MetricsModule } from "./metrics";
import { DbMetricsService } from "./dbMetrics.service";
import { UnitOfWorkModule } from "./unitOfWork";
import { BaseDataService } from "./points/baseData.service";
import { BlockTokenPriceRepository } from "./repositories";
import { BlockTokenPrice } from "./entities";
import { AddressFirstDeposit } from "./entities/addressFirstDeposit.entity";
import { BalanceOfLpRepository } from "./repositories";
import { PointsOfLpRepository } from "./repositories";
import { BlockAddressPointOfLpRepository, TxDataOfPointsRepository } from "./repositories";
import { TvlPointService } from "./points/tvlPoint.service";
import { TxVolPointService } from "./points/txVolPoint.service";
import { TxNumPointService } from "./points/txNumPoint.service";
import { BoosterService } from "./booster/booster.service";
import { ScheduleModule } from "@nestjs/schedule";
import { RedistributeBalanceService } from "./points/redistributeBalance.service";
import { DirectPointService } from "./points/directPoint.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    ScheduleModule.forRoot(),
    PrometheusModule.register(),
    TypeOrmModule.forRootAsync({
      name: "lrt",
      imports: [ConfigModule],
      useFactory: () => {
        return {
          ...typeOrmLrtModuleOptions,
          autoLoadEntities: true,
          retryDelay: 3000, // to cover 3 minute DB failover window
          retryAttempts: 70, // try to reconnect for 3.5 minutes,
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      name: "explorer",
      imports: [ConfigModule],
      useFactory: () => {
        return {
          ...typeOrmExplorerModuleOptions,
          autoLoadEntities: true,
          retryDelay: 3000, // to cover 3 minute DB failover window
          retryAttempts: 70, // try to reconnect for 3.5 minutes,
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      name: "refer",
      imports: [ConfigModule],
      useFactory: () => {
        return {
          ...typeOrmReferModuleOptions,
          autoLoadEntities: true,
          retryDelay: 3000, // to cover 3 minute DB failover window
          retryAttempts: 70, // try to reconnect for 3.5 minutes,
        };
      },
    }),
    TypeOrmModule.forFeature(
      [
        BlockTokenPrice,
        AddressFirstDeposit,
        PointsOfLp,
        BlockAddressPointOfLp,
        BlockAddressPoint,
        Point,
        BalanceOfLp,
        Project,
        Cache,
        TransactionDataOfPoints,
        RedistributeBalance,
        RedistributeBalanceHistory,
        User,
        UserHolding,
        UserStaked,
        UserWithdraw,
        BlockReferralPoints,
        ReferralPoints,
      ],
      "lrt"
    ),
    TypeOrmModule.forFeature([Referral], "refer"),
    TypeOrmModule.forFeature([Block, Token, Balance, Transfer], "explorer"),

    EventEmitterModule.forRoot(),
    MetricsModule,
    UnitOfWorkModule,
    HealthModule,
    HttpModule,
  ],
  providers: [
    AppService,
    TokenService,
    {
      provide: TokenOffChainDataProvider,
      useFactory: (configService: ConfigService, httpService: HttpService) => {
        const selectedProvider = configService.get<string>("tokens.selectedTokenOffChainDataProvider");
        switch (selectedProvider) {
          case "portalsFi":
            return new PortalsFiTokenOffChainDataProvider(httpService);
          default:
            return new CoingeckoTokenOffChainDataProvider(configService, httpService);
        }
      },
      inject: [ConfigService, HttpService],
    },
    TokenOffChainDataSaverService,
    BlockRepository,
    TokenRepository,
    TransferRepository,
    BalanceRepository,
    Logger,
    RetryDelayProvider,
    DbMetricsService,
    BaseDataService,
    BlockTokenPriceRepository,
    AddressFirstDepositRepository,
    BalanceOfLpRepository,
    PointsOfLpRepository,
    BlockAddressPointOfLpRepository,
    AdapterService,
    TvlPointService,
    ProjectRepository,
    CacheRepository,
    BridgePointService,
    BoosterService,
    TxVolPointService,
    TxNumPointService,
    TxDataOfPointsRepository,
    BridgeActiveService,
    RedistributeBalanceService,
    RedistributeBalanceRepository,
    RedistributeBalanceHistoryRepository,
    TvlPointLinkswapService,
    RedistributePointService,
    UserRepository,
    UserHoldingRepository,
    UserStakedRepository,
    UserWithdrawRepository,
    DirectPointService,
    PointsRepository,
    BlockAddressPointRepository,
    ReferralRepository,
    ReferralPointService,
    BlockReferralPointsRepository,
    ReferralPointsRepository,
  ],
})
export class AppModule {}
