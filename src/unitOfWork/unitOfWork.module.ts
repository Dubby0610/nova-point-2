import { Module } from "@nestjs/common";
import { MetricsModule } from "../metrics";
import { ReferralUnitOfWork, UnitOfWork, LrtUnitOfWork, ExplorerUnitOfWork } from "./unitOfWork.provider";

@Module({
  imports: [MetricsModule],
  providers: [UnitOfWork, ReferralUnitOfWork, LrtUnitOfWork, ExplorerUnitOfWork],
  exports: [UnitOfWork, ReferralUnitOfWork, LrtUnitOfWork, ExplorerUnitOfWork],
})
export class UnitOfWorkModule {}
