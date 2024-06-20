import {Stake, Withdraw} from "../generated/ZkdxStakingUSDC/ZkdxStakingUSDC";
import {PoolBalance} from "../generated/schema";
import {USDC_ADDRESS} from "./utils";

export function handleStake(event: Stake): void {

    let pool = event.address.toHex();
    let id = pool + "-" + event.params.account.toHex();

    let poolBalance = PoolBalance.load(id);
    if (!poolBalance) {
        poolBalance = new PoolBalance(id);
        poolBalance.pool = pool;
        poolBalance.account = event.params.account.toHex();
        poolBalance.token = USDC_ADDRESS;
        poolBalance.amount = event.params.amount;
    } else {
        poolBalance.amount = poolBalance.amount.plus(event.params.amount);
    }
    poolBalance.save();
}

export function handleWithdraw(event: Withdraw): void {

    let pool = event.address.toHex();
    let id = pool + "-" + event.params.account.toHex();

    let poolBalance = PoolBalance.load(id);
    if (!poolBalance) return;
    poolBalance.amount = poolBalance.amount.minus(event.params.amount);
    poolBalance.save();
}




