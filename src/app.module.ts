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
import { RedistributePointService } from './points/redistributePoint.service'
import {
  BatchRepository,
  BlockRepository,
  TokenRepository,
  TransferRepository,
  LogRepository,
  BalanceRepository,
  PointsRepository,
  PointsHistoryRepository,
  AddressFirstDepositRepository,
  ProjectRepository,
  CacheRepository,
  RedistributeBalanceRepository,
  RedistributeBalanceHistoryRepository,
  UserRepository,
  UserHoldingRepository,
  UserStakedRepository,
  UserWithdrawRepository
} from "./repositories";
import {
  Batch,
  Block,
  Transaction,
  AddressTransaction,
  TransactionReceipt,
  Log,
  Token,
  Address,
  Transfer,
  AddressTransfer,
  Balance,
  Point,
  PointsHistory,
  Referral,
  BlockAddressPoint,
  Invite,
  AddressTvl,
  AddressTokenTvl,
  GroupTvl,
  PointsOfLp,
  BlockAddressPointOfLp,
  BalanceOfLp,
  Project,
  Cache,
  TransactionDataOfPoints,
  RedistributeBalance,
  RedistributeBalanceHistory,
  User,
  UserHolding,
  UserStaked,
  UserWithdraw
} from "./entities";
import {
  typeOrmModuleOptions,
  typeOrmReferModuleOptions,
  typeOrmLrtModuleOptions,
  typeOrmExplorerModuleOptions,
} from "./typeorm.config";
import { RetryDelayProvider } from "./retryDelay.provider";
import { MetricsModule } from "./metrics";
import { DbMetricsService } from "./dbMetrics.service";
import { UnitOfWorkModule } from "./unitOfWork";
import { DepositPointService } from "./points/depositPoint.service";
import { BlockTokenPriceRepository } from "./repositories";
import { BlockTokenPrice } from "./entities";
import { BlockAddressPointRepository } from "./repositories";
import { InviteRepository } from "./repositories";
import { ReferrerRepository } from "./repositories";
import { BlockGroupTvl } from "./entities/blockGroupTvl.entity";
import { GroupTvlRepository } from "./repositories";
import { AddressTvlRepository } from "./repositories";
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    ScheduleModule.forRoot(),
    PrometheusModule.register(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        return {
          ...typeOrmModuleOptions,
          autoLoadEntities: true,
          retryDelay: 3000, // to cover 3 minute DB failover window
          retryAttempts: 70, // try to reconnect for 3.5 minutes,
        };
      },
    }),
    TypeOrmModule.forFeature([
      Batch,
      Block,
      Transaction,
      AddressTransaction,
      TransactionReceipt,
      Log,
      Token,
      Address,
      AddressTransfer,
      Balance,
      Point,
      PointsHistory,
      BlockTokenPrice,
      BlockAddressPoint,
      BlockGroupTvl,
      AddressTvl,
      AddressTokenTvl,
      AddressFirstDeposit,
      GroupTvl,
      Transfer,
    ]),

    TypeOrmModule.forRootAsync({
      name: "refer",
      imports: [ConfigModule],
      useFactory: () => {
        return {
          ...typeOrmReferModuleOptions,
          autoLoadEntities: true,
          retryDelay: 3000, // to cover 3 minute DB failover window
          retryAttempts: 70, // try to reconnect for 3.5 minutes,
          name: 'refer'
        };
      },
    }),
    TypeOrmModule.forFeature([Invite, Referral], "refer"),

    TypeOrmModule.forRootAsync({
      name: "lrt",
      imports: [ConfigModule],
      useFactory: () => {
        return {
          ...typeOrmLrtModuleOptions,
          autoLoadEntities: true,
          retryDelay: 3000, // to cover 3 minute DB failover window
          retryAttempts: 70, // try to reconnect for 3.5 minutes,
          name: 'lrt'
        };
      },
    }),
    TypeOrmModule.forFeature(
      [
        PointsOfLp,
        BlockAddressPointOfLp,
        BalanceOfLp,
        Project,
        Cache,
        TransactionDataOfPoints,
        RedistributeBalance,
        RedistributeBalanceHistory,
        User,
        UserHolding,
        UserStaked,
        UserWithdraw
      ],
      "lrt"
    ),

    TypeOrmModule.forRootAsync({
      name: "explorer",
      imports: [ConfigModule],
      useFactory: () => {
        return {
          ...typeOrmExplorerModuleOptions,
          autoLoadEntities: true,
          retryDelay: 3000, // to cover 3 minute DB failover window
          retryAttempts: 70, // try to reconnect for 3.5 minutes,
          name: 'explorer'
        };
      },
    }),
    // TypeOrmModule.forFeature([Transfer], "explorer"),

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
    BatchRepository,
    BlockRepository,
    TokenRepository,
    TransferRepository,
    BalanceRepository,
    LogRepository,
    PointsRepository,
    PointsHistoryRepository,
    Logger,
    RetryDelayProvider,
    DbMetricsService,
    DepositPointService,
    BlockTokenPriceRepository,
    BlockAddressPointRepository,
    InviteRepository,
    ReferrerRepository,
    GroupTvlRepository,
    AddressTvlRepository,
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
    UserWithdrawRepository
  ],
})
export class AppModule { }
