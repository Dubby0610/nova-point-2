/** viewed */

import { MarketListed } from '../generated/LayerBank/LayerBankCore'
import { LayerBankLToken, Transfer } from '../generated/templates/LayerBankLToken/LayerBankLToken'
import { PoolTokenPosition, Pool } from '../generated/schema'
import { LayerBankLToken as LayerBankLTokenTemplate } from '../generated/templates'
import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { setUserInvalid } from './general'

export function handleMarketListed(event: MarketListed): void {
    const gToken = event.params.gToken
    let pool = Pool.load(gToken)
    if (!pool) {
        pool = new Pool(gToken)
        const lToken = LayerBankLToken.bind(gToken)
        pool.underlying = lToken.underlying()
        pool.decimals = BigInt.fromI32(lToken.decimals())
        pool.balance = lToken.getCash()
        pool.totalSupplied = lToken.totalSupply()
        pool.symbol = Bytes.fromHexString(lToken.symbol())
        pool.name = lToken.name()
        pool.save()
        LayerBankLTokenTemplate.create(gToken)
    }
}

export function handleTransfer(event: Transfer): void {
    setUserInvalid(event.address)

    const lToken = LayerBankLToken.bind(event.address)
    const underlying = lToken.underlying()
    let pool = Pool.load(event.address)
    if (!pool) {
        pool = new Pool(event.address)
        pool.name = lToken.name()
        pool.symbol = lToken.underlying()
        pool.underlying = underlying
        pool.decimals = BigInt.fromI32(lToken.decimals())
        pool.balance = BigInt.zero()
        pool.totalSupplied = BigInt.zero()
        pool.save()
    }
    // update from to
    if (event.params.from.notEqual(Address.zero())) {
        updateTokenPosition(event.params.from, event, pool)
    }

    // update to address
    if (event.params.to.notEqual(Address.zero())) {
        updateTokenPosition(event.params.to, event, pool)
    }
}

function updateTokenPosition(user: Address, event: Transfer, pool: Pool): void {

    const lToken = LayerBankLToken.bind(event.address)
    let poolBalance = lToken.getCash();

    pool.balance = poolBalance
    pool.totalSupplied = lToken.totalSupply();
    pool.save()


    const poolTokenPositionId = user.concat(pool.underlying).concat(pool.id)
    let poolTokenPosition = PoolTokenPosition.load(poolTokenPositionId)
    if (!poolTokenPosition) {
        poolTokenPosition = new PoolTokenPosition(poolTokenPositionId)
    }
    const supplied = lToken.balanceOf(user)
    poolTokenPosition.token = pool.underlying
    poolTokenPosition.pool = pool.id
    poolTokenPosition.poolName = lToken.name()
    poolTokenPosition.supplied = supplied
    poolTokenPosition.userPosition = user
    poolTokenPosition.save()
}



