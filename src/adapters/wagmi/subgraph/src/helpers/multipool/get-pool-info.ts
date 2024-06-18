import { BigInt } from "@graphprotocol/graph-ts";
import { MultipoolDispatcher, MultipoolDispatcher__poolInfoResult } from "../../../generated/MultipoolDispatcher/MultipoolDispatcher";
import { MULTIPOOL_DISPATCHER_ADDRESS } from "../../constants";

export function getPoolInfo(pidId: BigInt): MultipoolDispatcher__poolInfoResult{
    const dispatcher = MultipoolDispatcher.bind(MULTIPOOL_DISPATCHER_ADDRESS); 
    return dispatcher.poolInfo(pidId);
}