import {Stake, Withdraw} from "../generated/ZkdxStakingUSDC/ZkdxStakingUSDC";
import {StakingBalance} from "../generated/schema";
import {USDC_ADDRESS} from "./constants";

export function handleStake(event: Stake): void {

    let pool = event.address.toHex();
    let id = pool + "-" + event.params.account.toHex();

    let stakingBalance = StakingBalance.load(id);
    if (!stakingBalance) {
        stakingBalance = new StakingBalance(id);
        stakingBalance.pool = pool;
        stakingBalance.account = event.params.account.toHex();
        stakingBalance.token = USDC_ADDRESS;
        stakingBalance.amount = event.params.amount;
    } else {
        stakingBalance.amount = stakingBalance.amount.plus(event.params.amount);
    }
    stakingBalance.save();
}

export function handleWithdraw(event: Withdraw): void {

    let pool = event.address.toHex();
    let id = pool + "-" + event.params.account.toHex();

    let stakingBalance = StakingBalance.load(id);
    if (!stakingBalance) return;
    stakingBalance.amount = stakingBalance.amount.minus(event.params.amount);
    stakingBalance.save();
}




