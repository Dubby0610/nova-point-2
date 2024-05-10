import { MarketListed } from '../generated/LayerBank/LayerBankCore'
import { LayerBankLToken, Transfer } from '../generated/templates/LayerBankLToken/LayerBankLToken'
import { PoolTokenPosition, Pool } from '../generated/schema'
import { LayerBankLToken as LayerBankLTokenTemplate } from '../generated/templates'
import { Address, BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import { setUserInvalid, updateUserBalance } from './general'
import { fetchTokenSymbol } from './utils/tokenHelper'

export function handleMarketListed(event: MarketListed): void {
    const gToken = event.params.gToken
    let pool = Pool.load(Bytes.fromHexString(gToken.toHexString()))
    const lToken = LayerBankLToken.bind(gToken)
    const symbol = fetchTokenSymbol(lToken.underlying())

    if (!pool) {
        pool = new Pool(Bytes.fromHexString(gToken.toHexString()))
        pool.address = Bytes.fromHexString(gToken.toHexString())
        pool.underlying = lToken.underlying()
        pool.decimals = BigInt.fromI32(lToken.decimals())
        pool.balance = lToken.getCash()
        pool.totalSupplied = lToken.totalSupply()
        pool.symbol = symbol
        pool.name = lToken.name()
        pool.save()
        LayerBankLTokenTemplate.create(gToken)
    }
}

export function handleTransfer(event: Transfer): void {
    const lToken = LayerBankLToken.bind(event.address)
    const symbol = fetchTokenSymbol(lToken.underlying())
    log.info('example_2 name {},symbol {}, underlying {}', [lToken.name(), symbol, lToken.underlying().toHexString()])
    const underlying = lToken.underlying()
    let pool = Pool.load(event.address)
    if (!pool) {
        pool = new Pool(event.address)
        pool.address = event.address
        pool.name = lToken.name()
        pool.symbol = symbol
        pool.underlying = underlying
        pool.decimals = BigInt.fromI32(lToken.decimals())
        pool.balance = BigInt.zero()
        pool.totalSupplied = BigInt.zero()
        pool.save()
    } else {
        pool.symbol = symbol
        pool.underlying = underlying
        pool.save()
    }
    setUserInvalid(event.address)
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
    const userPosition = updateUserBalance(user, BigInt.zero())

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
    poolTokenPosition.userPosition = userPosition.id
    poolTokenPosition.save()
}



