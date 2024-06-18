import {Transaction} from "../generated/schema";
import {convertDecimal} from "./utils";
import {BuyLP, RedeemLP} from "../generated/ZKLPool/ZKLPool";

export function handleBuyLP(event: BuyLP): void {

    let id = event.transaction.hash.toHex();
    let transaction = new Transaction(id);
    transaction.timestamp = event.block.timestamp;
    transaction.user_address = event.params.account.toHex();
    transaction.contract_address = event.address.toHex();
    transaction.token_address = event.params._tokenIn.toHex();
    transaction.price = convertDecimal(event.params._usdAmount, 18);
    transaction.amount = event.params._amountIn;
    transaction.nonce = event.transaction.nonce;
    transaction.save();
}

export function handleRedeemLP(event: RedeemLP): void {

    let id = event.transaction.hash.toHex();
    let transaction = new Transaction(id);
    transaction.timestamp = event.block.timestamp;
    transaction.user_address = event.params.account.toHex();
    transaction.contract_address = event.address.toHex();
    transaction.token_address = event.params._tokenOut.toHex();
    transaction.price = convertDecimal(event.params._usdAmount, 18);
    transaction.amount = event.params._amountOut;
    transaction.nonce = event.transaction.nonce;
    transaction.save();
}



