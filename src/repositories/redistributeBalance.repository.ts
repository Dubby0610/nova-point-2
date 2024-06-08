import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { RedistributeBalanceHistory, RedistributeBalance } from "../entities";
import { RedistributeBalanceHistoryRepository } from './redistributeBalanceHistory.repository'


@Injectable()
export class RedistributeBalanceRepository extends BaseRepository<RedistributeBalance> {
  public constructor(
    unitOfWork: LrtUnitOfWork,
    private readonly redistributeBalanceHistoryRepository: RedistributeBalanceHistoryRepository) {
    super(RedistributeBalance, unitOfWork);
  }

  public async updateCumulativeData(newHoldings: RedistributeBalanceHistory[]): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await this.unitOfWork.useTransaction(async () => {
      // Insert new hourly_holdings data
      await this.redistributeBalanceHistoryRepository.addMany(newHoldings);

      // Get unique combinations of userAddress, tokenAddress, and pairAddress
      const userAddressSet = new Set(newHoldings.map(holding => holding.userAddress));
      const tokenAddressSet = new Set(newHoldings.map(holding => holding.tokenAddress));
      const pairAddressSet = new Set(newHoldings.map(holding => holding.pairAddress));

      const userAddresses = Array.from(userAddressSet);
      const tokenAddresses = Array.from(tokenAddressSet);
      const pairAddresses = Array.from(pairAddressSet);

      // Precompute total balances for all tokenAddress and pairAddress combinations
      const existingPairTotalBalances = await transactionManager
        .createQueryBuilder(RedistributeBalance, "hbp")
        .select([
          "hbp.tokenAddress",
          "hbp.pairAddress",
          "SUM(CAST(hbp.accumulateBalance AS DECIMAL)) AS totalAccumulateBalance"
        ])
        .where("hbp.tokenAddress IN (:...tokenAddresses)", { tokenAddresses })
        .andWhere("hbp.pairAddress IN (:...pairAddresses)", { pairAddresses })
        .groupBy("hbp.tokenAddress, hbp.pairAddress")
        .getRawMany();

      // Create a map for quick lookup of pair total balances
      const pairTotalBalanceMap = new Map<string, bigint>();
      existingPairTotalBalances.forEach((balance) => {
        const key = `${balance.tokenAddress}-${balance.pairAddress}`;
        pairTotalBalanceMap.set(key, BigInt(balance.totalAccumulateBalance));
      });

      newHoldings.forEach(holding => {
        const key = `${holding.tokenAddress}-${holding.pairAddress}`;
        const currentBalance = pairTotalBalanceMap.get(key) || BigInt(0);
        pairTotalBalanceMap.set(key, currentBalance + BigInt(holding.balance));
      });

      // Query hourly_balance_percentage records that need updating
      const balancePercentages = await transactionManager
        .createQueryBuilder(RedistributeBalance, "hbp")
        .where("hbp.userAddress IN (:...userAddresses)", { userAddresses })
        .andWhere("hbp.tokenAddress IN (:...tokenAddresses)", { tokenAddresses })
        .andWhere("hbp.pairAddress IN (:...pairAddresses)", { pairAddresses })
        .getMany();

      // Create a map for quick lookup of hourly_balance_percentage records
      const balancePercentageMap = new Map<string, RedistributeBalance>();
      balancePercentages.forEach((bp) => {
        const key = `${bp.userAddress}-${bp.tokenAddress}-${bp.pairAddress}`;
        balancePercentageMap.set(key, bp);
      });

      // Calculate new cumulative balances and update percentages
      const hourlyBalancePercentageData = []
      for (const holding of newHoldings) {
        const key = `${holding.userAddress}-${holding.tokenAddress}-${holding.pairAddress}`;
        let record = balancePercentageMap.get(key);

        if (!record) {
          // Create a new record if not found
          record = new RedistributeBalance();
          record.userAddress = holding.userAddress;
          record.tokenAddress = holding.tokenAddress;
          record.pairAddress = holding.pairAddress;
          record.blockNumber = holding.blockNumber;
          record.accumulateBalance = "0";
          record.percentage = "0";
          record.balance = holding.balance;
          balancePercentageMap.set(key, record);
        }

        // Update totalBalance
        record.accumulateBalance = (BigInt(record.accumulateBalance) + BigInt(holding.balance)).toString();

        // Calculate percentage
        const pairKey = `${holding.tokenAddress}-${holding.pairAddress}`;
        const totalPairBalance = pairTotalBalanceMap.get(pairKey);
        const percentage = (Number(record.accumulateBalance) / Number(totalPairBalance)).toFixed(18);
        record.percentage = percentage;

        // Save the record
        hourlyBalancePercentageData.push(record)
      }
      await transactionManager.save(RedistributeBalance, hourlyBalancePercentageData);
    });
  }
}
