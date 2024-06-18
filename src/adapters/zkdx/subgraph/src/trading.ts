import {Transaction} from "../generated/schema";
import {BigDecimal} from "@graphprotocol/graph-ts";
import {Decrease, Increase} from "../generated/ZkdxVault/ZkdxVault";

export function handleIncrease(event: Increase): void {

    let id = event.transaction.hash.toHex();
    let transaction = new Transaction(id);
    transaction.timestamp = event.block.timestamp;
    transaction.user_address = event.params.from.toHex();
    transaction.contract_address = event.address.toHex();
    transaction.token_address = event.params.token.toHex();
    transaction.price = BigDecimal.fromString("1");
    transaction.amount = event.params.amount;
    transaction.nonce = event.transaction.nonce;
    transaction.save();
}

export function handleDecrease(event: Decrease): void {

    let id = event.transaction.hash.toHex();
    let transaction = new Transaction(id);
    transaction.timestamp = event.block.timestamp;
    transaction.user_address = event.params.to.toHex();
    transaction.contract_address = event.address.toHex();
    transaction.token_address = event.params.token.toHex();
    transaction.price = BigDecimal.fromString("1");
    transaction.amount = event.params.amount;
    transaction.nonce = event.transaction.nonce;
    transaction.save();
}



