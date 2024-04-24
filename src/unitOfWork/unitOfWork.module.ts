import { Module } from "@nestjs/common";
import { MetricsModule } from "../metrics";
import { ReferralUnitOfWork, UnitOfWork, LrtUnitOfWork } from "./unitOfWork.provider";

@Module({
  imports: [MetricsModule],
  providers: [UnitOfWork, ReferralUnitOfWork, LrtUnitOfWork],
  exports: [UnitOfWork, ReferralUnitOfWork, LrtUnitOfWork],
})
export class UnitOfWorkModule {}
