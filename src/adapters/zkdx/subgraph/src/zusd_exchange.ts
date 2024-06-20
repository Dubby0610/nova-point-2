import {PoolBalance, Transaction} from "../generated/schema";
import {Exchange, Redeem} from "../generated/ZUSDPool/ZUSDPool";
import {BigDecimal} from "@graphprotocol/graph-ts";

export function handleExchange(event: Exchange): void {

    let account = event.params.account.toHex();
    let pool = event.address.toHex();
    let tvlId = pool + "-" + account;
    let token = event.params._tokenIn.toHex();
    let amount = event.params._amountIn;

    // tvl record
    let poolBalance = PoolBalance.load(tvlId);
    if (!poolBalance) {
        poolBalance = new PoolBalance(tvlId);
        poolBalance.pool = pool;
        poolBalance.account = account;
        poolBalance.token = token;
        poolBalance.amount = amount;
    } else {
        poolBalance.amount = poolBalance.amount.plus(amount);
    }
    poolBalance.save();

    // vol record
    let txId = event.transaction.hash.toHex();
    let transaction = new Transaction(txId);
    transaction.timestamp = event.block.timestamp;
    transaction.user_address = account;
    transaction.contract_address = pool;
    transaction.token_address = token;
    transaction.price = BigDecimal.fromString("1");
    transaction.amount = amount;
    transaction.nonce = event.transaction.nonce;
    transaction.block_number = event.block.number;
    transaction.save();
}

export function handleRedeem(event: Redeem): void {

    let account = event.params.account.toHex();
    let pool = event.address.toHex();
    let tvlId = pool + "-" + account;
    let token = event.params._tokenOut.toHex();
    let amount = event.params._amountOut;

    // tvl record
    let poolBalance = PoolBalance.load(tvlId);
    if (!poolBalance) return;
    poolBalance.amount = poolBalance.amount.minus(amount);
    poolBalance.save();

    // vol record
    let txId = event.transaction.hash.toHex();
    let transaction = new Transaction(txId);
    transaction.timestamp = event.block.timestamp;
    transaction.user_address = account;
    transaction.contract_address = pool;
    transaction.token_address = token;
    transaction.price = BigDecimal.fromString("1");
    transaction.amount = amount;
    transaction.nonce = event.transaction.nonce;
    transaction.block_number = event.block.number;
    transaction.save();
}



