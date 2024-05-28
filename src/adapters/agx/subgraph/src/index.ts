import { ALP, Transfer } from '../generated/agx-lp/ALP'
import { Swap } from '../generated/agx-swap/Router'
import { VaultPriceFeed } from '../generated/agx-swap/VaultPriceFeed'
import { Pool, SwapTx, UserPosition } from '../generated/schema'
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { fetchTokenDecimals } from './utils/tokenHelper'
import { VAULT_PRICE_FEED } from './utils/constants'

function updatePoolSupply(event: Transfer): void {
    if (event.params.from.equals(Address.zero()) || event.params.to.equals(Address.zero())) {
        const ALPContract = ALP.bind(event.address)
        let pool = Pool.load(event.address)
        if (!pool) {
            pool = new Pool(event.address)
        }
        pool.totalSupplied = ALPContract.totalSupply()
        pool.save()
    }
}

function updateUserBalance(event: Transfer): void {
    if (event.params.from.notEqual(Address.zero()) && event.params.from.notEqual(event.address)) {
        let position = UserPosition.load(event.params.from);
        if (!position) {
            position = new UserPosition(event.params.from)
            position.balance = BigInt.zero()
        } else {
            position.balance = position.balance.minus(event.params.value)
        }

        position.save()
    }

    if (event.params.to.notEqual(Address.zero()) && event.params.to.notEqual(event.address)) {
        let position = UserPosition.load(event.params.to);
        if (!position) {
            position = new UserPosition(event.params.to)
            position.balance = BigInt.zero()
        }
        position.balance = position.balance.plus(event.params.value)
        position.save()
    }
}

export function handleTransfer(event: Transfer): void {
    updatePoolSupply(event)
    updateUserBalance(event)
}

export function handleSwap(event: Swap): void {
    const decimal = fetchTokenDecimals(event.params.tokenOut)
    const vaultPriceFeed = VaultPriceFeed.bind(VAULT_PRICE_FEED)
    const swapTx = new SwapTx(event.transaction.hash)
    swapTx.account = event.params.account
    swapTx.tokenAddress = event.params.tokenOut
    swapTx.amount = event.params.amountOut
    swapTx.price = vaultPriceFeed.getLatestPrimaryPrice(event.params.tokenOut)
    swapTx.decimal = decimal
    swapTx.transactionHash = event.transaction.hash
    swapTx.nonce = event.transaction.nonce
    swapTx.blockNumber = event.block.number
    swapTx.timestamp = event.block.timestamp
    swapTx.save()
}



