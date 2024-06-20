import {Transaction} from "../generated/schema";
import {BuyLP, RedeemLP} from "../generated/ZKLPool/ZKLPool";
import {BigDecimal} from "@graphprotocol/graph-ts";

export function handleBuyLP(event: BuyLP): void {

    let id = event.transaction.hash.toHex();
    let transaction = new Transaction(id);
    transaction.timestamp = event.block.timestamp;
    transaction.user_address = event.params.account.toHex();
    transaction.contract_address = event.address.toHex();
    transaction.token_address = event.params._tokenIn.toHex();
    transaction.price = BigDecimal.fromString("1");
    transaction.amount = event.params._amountIn;
    transaction.nonce = event.transaction.nonce;
    transaction.block_number = event.block.number;
    transaction.save();
}

export function handleRedeemLP(event: RedeemLP): void {

    let id = event.transaction.hash.toHex();
    let transaction = new Transaction(id);
    transaction.timestamp = event.block.timestamp;
    transaction.user_address = event.params.account.toHex();
    transaction.contract_address = event.address.toHex();
    transaction.token_address = event.params._tokenOut.toHex();
    transaction.price = BigDecimal.fromString("1");
    transaction.amount = event.params._amountOut;
    transaction.nonce = event.transaction.nonce;
    transaction.block_number = event.block.number;
    transaction.save();
}