import { Injectable } from "@nestjs/common";
import { Transfer, TransferType } from "../entities";
import { ExplorerUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { LessThan } from "typeorm";

@Injectable()
export class TransferRepository extends BaseRepository<Transfer> {
  public constructor(unitOfWork: UnitOfWork) {
    super(Transfer, unitOfWork);
  }

  public async getDeposits(address: Buffer, blockNumber: number): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.query(
      `SELECT * FROM transfers WHERE type = 'deposit' AND "from" = $1 AND "blockNumber" <= $2;`,
      [address, blockNumber]
    );
  }

  public async getBlockDeposits(blockNumber: number): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.query(`SELECT * FROM transfers WHERE type = 'deposit' AND "blockNumber" = $1;`, [
      blockNumber,
    ]);
  }

  public async isNewDeposit(address: string, blockNumber: number): Promise<boolean> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const count = await transactionManager.count<Transfer>(Transfer, {
      where: {
        from: address,
        type: TransferType.Deposit,
        blockNumber: LessThan(blockNumber),
      },
    });
    return count == 0;
  }

  public async getAddressFirstDeposit(address: string): Promise<Transfer | undefined> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [firstDeposit] = await transactionManager.find<Transfer>(Transfer, {
      where: {
        from: address,
        type: TransferType.Deposit,
      },
      select: ["timestamp"],
      take: 1,
      order: {
        timestamp: "ASC",
      },
    });
    return firstDeposit;
  }

  public async getLatestTransfers(fromBlockNumber: number, addresses: string[]): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const addressesBuf = addresses.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const query = `SELECT * FROM "transfers" WHERE "blockNumber" > $1 AND "from" = ANY($2) order by "blockNumber" asc, number asc;`;
    const results = await transactionManager.query(query, [fromBlockNumber, addressesBuf]);
    return results.map((row: any) => {
      row.to = "0x" + row.to.toString("hex");
      row.from = "0x" + row.from.toString("hex");
      row.tokenAddress = "0x" + row.tokenAddress.toString("hex");
      return row;
    });
  }

  public async getLatestQulifyTransfers(
    fromBlockNumber: number,
    bridgeAddresses: string[],
    ethAddresses: string[],
    ethAmount: bigint,
    usdtUsdcAddresses: string[],
    usdtUsdcAmount: bigint
  ): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const bridgeAddressesBuf = bridgeAddresses.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const ethAddressesBuf = ethAddresses.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const usdtUsdcAddressesBuf = usdtUsdcAddresses.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const query = `
    SELECT * FROM "transfers"
    WHERE "blockNumber" > $1 AND "from" = ANY ($2) AND
    (
        ("tokenAddress" = ANY($3) AND cast(amount AS numeric) >= $4)
        OR
        ("tokenAddress" = ANY($5) AND cast(amount AS numeric) >= $6)
    )
    ORDER BY "blockNumber" ASC, number ASC;
    `;
    const results = await transactionManager.query(query, [
      fromBlockNumber,
      bridgeAddressesBuf,
      ethAddressesBuf,
      ethAmount,
      usdtUsdcAddressesBuf,
      usdtUsdcAmount,
    ]);
    return results.map((row: any) => {
      row.to = "0x" + row.to.toString("hex");
      row.from = "0x" + row.from.toString("hex");
      row.tokenAddress = "0x" + row.tokenAddress.toString("hex");
      return row;
    });
  }

  public async getSymbiosisLatestQulifyTransfers(
    fromBlockNumber: number,
    bridgeAddresses: string[],
    ethAddresses: string[],
    ethAmount: bigint,
    usdtUsdcAddresses: string[],
    usdtUsdcAmount: bigint,
    notEqualToAddress: string[],
    baseBridgeAddress: string
  ): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const bridgeAddressesBuf = bridgeAddresses.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const ethAddressesBuf = ethAddresses.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const usdtUsdcAddressesBuf = usdtUsdcAddresses.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const notEqualToAddressBuf = notEqualToAddress.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const baseBridgeAddressBuf = Buffer.from(baseBridgeAddress.substring(2), "hex");
    const topic0 = Buffer.from(
      "0xaeef64b7687b985665b6620c7fa271b6f051a3fbe2bfc366fb9c964602eb6d26".substring(2),
      "hex"
    );
    const eventQuery = `
        SELECT "transactionHash" FROM logs
        WHERE "blockNumber" > $1
        AND address = $2
        AND topics[1] = $3;
    `;
    const thashResults = await transactionManager.query(eventQuery, [fromBlockNumber, baseBridgeAddressBuf, topic0]);
    const transactionHashs: Buffer[] = thashResults.map((row: any) => {
      return row.transactionHash;
    });
    if (transactionHashs.length == 0) {
      return [];
    }
    const query = `
    SELECT * FROM "transfers"
    WHERE "blockNumber" > $1
    AND "from" = ANY($2)
    AND
        (
            ("tokenAddress" = ANY($3) AND cast(amount AS numeric) >= $4)
            OR
            ("tokenAddress" = ANY($5) AND cast(amount AS numeric) >= $6)
        )
    AND "to" <> ALL($7)
    AND "transactionHash" = ANY($8)
    ORDER BY "blockNumber" ASC, number ASC;
    `;
    const results = await transactionManager.query(query, [
      fromBlockNumber,
      bridgeAddressesBuf,
      ethAddressesBuf,
      ethAmount,
      usdtUsdcAddressesBuf,
      usdtUsdcAmount,
      notEqualToAddressBuf,
      transactionHashs,
    ]);
    return results.map((row: any) => {
      row.to = "0x" + row.to.toString("hex");
      row.from = "0x" + row.from.toString("hex");
      row.tokenAddress = "0x" + row.tokenAddress.toString("hex");
      return row;
    });
  }

  public async getBtcTransfersByBlockNumber(
    fromBlockNumber: number,
    bridgeAddresses: string[],
    btcAddresses: string[],
    btcAmount: bigint
  ): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const bridgeAddressesBuf = bridgeAddresses.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const btcAddressesBuf = btcAddresses.map((item) => {
      return Buffer.from(item.substring(2), "hex");
    });
    const query = `
    SELECT * FROM "transfers"
    WHERE "blockNumber" > $1 AND "from" = ANY ($2) AND
    ("tokenAddress" = ANY($3) AND cast(amount AS numeric) >= $4)
    ORDER BY "blockNumber" ASC, number ASC;
    `;
    const results = await transactionManager.query(query, [
      fromBlockNumber,
      bridgeAddressesBuf,
      btcAddressesBuf,
      btcAmount,
    ]);
    return results.map((row: any) => {
      row.to = "0x" + row.to.toString("hex");
      row.from = "0x" + row.from.toString("hex");
      row.tokenAddress = "0x" + row.tokenAddress.toString("hex");
      return row;
    });
  }
}
