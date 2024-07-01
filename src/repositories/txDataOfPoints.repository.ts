import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { Project, TransactionDataOfPoints } from "../entities";
import { Between, MoreThanOrEqual } from "typeorm";
export interface TransactionDataOfPointsDto {
  userAddress: string;
  contractAddress: string;
  tokenAddress: string;
  decimals: number;
  price: string;
  quantity: string;
  nonce: string;
  timestamp: Date;
  txHash: string;
  blockNumber: number;
  projectName: string;
}

export interface TxNumberGroupByUserAddressAndContractAddressDto {
  userAddress: string;
  contractAddress: string;
  txNumber: number;
  blockNumber: number;
  projectName: string;
}
@Injectable()
export class TxDataOfPointsRepository extends BaseRepository<TransactionDataOfPoints> {
  public constructor(unitOfWork: UnitOfWork) {
    super(TransactionDataOfPoints, unitOfWork);
  }

  /**
   * 
   * @deprecated using getTxsByBlockNumber instead 
   */
  public async getListByBlockNumber(
    startBlockNumber: number,
    endBlockNumber: number,
    projectNames: string[]
  ): Promise<TransactionDataOfPointsDto[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `SELECT a.*, b.name AS "projectName" FROM public."transactionDataOfPoints" AS a LEFT JOIN project AS b ON a."contractAddress"= b."pairAddress" WHERE a."blockNumber" >= $1 AND a."blockNumber" < $2 AND b.name = ANY($3);`,
      [startBlockNumber, endBlockNumber, projectNames]
    );
    return result.map((row: any) => {
      row.userAddress = "0x" + row.userAddress.toString("hex").toLowerCase();
      row.contractAddress = "0x" + row.contractAddress.toString("hex").toLowerCase();
      row.tokenAddress = "0x" + row.tokenAddress.toString("hex").toLowerCase();
      row.txHash = "0x" + row.txHash.toString("hex").toLowerCase();
      row.timestamp = new Date(row.timestamp);
      return row;
    });
  }

  public async getProjectTxsByBlockNumber(
    projectName: string,
    startBlockNumber: number,
    endBlockNumber: number
  ) {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager
      .createQueryBuilder(TransactionDataOfPoints, "tdp")
      .innerJoin(Project, "project", "tdp.contractAddress = project.pairAddress")
      .where("project.name = :projectName", { projectName })
      .andWhere("tdp.blockNumber BETWEEN :startBlockNumber AND :endBlockNumber", { startBlockNumber, endBlockNumber })
      .getMany();
    return result
  }

  public async getTxNumberListByBlockNumber(
    startBlockNumber: number,
    endBlockNumber: number
  ): Promise<TxNumberGroupByUserAddressAndContractAddressDto[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `SELECT a."userAddress", a."contractAddress", count(*) AS "txNumber", b.name AS "projectName" FROM public."transactionDataOfPoints" AS a LEFT JOIN project AS b ON a."contractAddress"=b."pairAddress" WHERE a."blockNumber" >= $1 AND a."blockNumber" < $2  GROUP BY a."userAddress",a."contractAddress";`,
      [startBlockNumber, endBlockNumber]
    );
    return result.map((row: any) => {
      row.userAddress = "0x" + row.userAddress.toString("hex").toLowerCase();
      row.contractAddress = "0x" + row.contractAddress.toString("hex").toLowerCase();
      return row;
    });
  }
}
