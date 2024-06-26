import { Module } from "@nestjs/common";
import { MetricsModule } from "../metrics";
import { ReferralUnitOfWork, LrtUnitOfWork, ExplorerUnitOfWork, UnitOfWork } from "./unitOfWork.provider";

@Module({
  imports: [MetricsModule],
  providers: [ReferralUnitOfWork, LrtUnitOfWork, ExplorerUnitOfWork],
  exports: [ReferralUnitOfWork, LrtUnitOfWork, ExplorerUnitOfWork],
})
export class UnitOfWorkModule {}
