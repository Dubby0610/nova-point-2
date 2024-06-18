import { MarketListed } from '../generated/Shoebill/ShoebillUnitroller';
import {
  ShoebillSbToken,
  Transfer,
  Borrow,
  RepayBorrow
} from '../generated/templates/ShoebillSbToken/ShoebillSbToken';
import { PoolTokenPosition, Pool } from '../generated/schema';
import { ShoebillSbToken as ShoebillSbTokenTemplate } from '../generated/templates';
import { Address, BigInt, Bytes, log } from '@graphprotocol/graph-ts';
import { setUserInvalid, updateUserBalance } from './general';
import { fetchTokenSymbol } from './utils/tokenHelper';
import { ADDRESS_ZERO } from './utils/constants';

export function handleMarketListed(event: MarketListed): void {
  const gToken = event.params.gToken;
  let pool = Pool.load(Bytes.fromHexString(gToken.toHexString()));
  const lToken = ShoebillSbToken.bind(gToken);
  const underlying = lToken.try_underlying();

  const symbol = underlying.reverted ? 'ETH' : fetchTokenSymbol(underlying.value);

  if (!pool) {
    pool = new Pool(Bytes.fromHexString(gToken.toHexString()));
    pool.address = Bytes.fromHexString(gToken.toHexString());
    pool.underlying = underlying.reverted ? Bytes.fromHexString(ADDRESS_ZERO) : underlying.value;
    pool.decimals = BigInt.fromI32(lToken.decimals());
    pool.balance = lToken.getCash();
    pool.totalSupplied = lToken.totalSupply();
    pool.symbol = symbol;
    pool.name = lToken.name();
    pool.save();
    ShoebillSbTokenTemplate.create(gToken);
  }
}

export function handleTransfer(event: Transfer): void {
  const lToken = ShoebillSbToken.bind(event.address);
  const underlyingCall = lToken.try_underlying();
  const symbol = underlyingCall.reverted ? 'ETH' : fetchTokenSymbol(underlyingCall.value);
  log.info('example_2 name {},symbol {}, underlying {}', [lToken.name(), symbol, 'ETH']);
  const underlying = underlyingCall.reverted
    ? Bytes.fromHexString(ADDRESS_ZERO)
    : underlyingCall.value;
  let pool = Pool.load(event.address);
  if (!pool) {
    pool = new Pool(event.address);
    pool.address = event.address;
    pool.name = lToken.name();
    pool.symbol = symbol;
    pool.underlying = underlying;
    pool.decimals = BigInt.fromI32(lToken.decimals());
    pool.balance = BigInt.zero();
    pool.totalSupplied = BigInt.zero();
    pool.save();
  } else {
    pool.symbol = symbol;
    pool.underlying = underlying;
    pool.save();
  }
  setUserInvalid(event.address);
  // update from to
  if (event.params.from.notEqual(Address.zero())) {
    updateTokenPosition(event.params.from, event, pool);
  }

  // update to address
  if (event.params.to.notEqual(Address.zero())) {
    updateTokenPosition(event.params.to, event, pool);
  }
}

export function handleBorrow(event: Borrow): void {
  const lToken = ShoebillSbToken.bind(event.address);

  let pool = Pool.load(event.address)!;
  let poolBalance = lToken.getCash();

  pool.balance = poolBalance;
  pool.save();
}

export function handleRepayBorrow(event: RepayBorrow): void {
  const lToken = ShoebillSbToken.bind(event.address);

  let pool = Pool.load(event.address)!;
  let poolBalance = lToken.getCash();

  pool.balance = poolBalance;
  pool.save();
}

function updateTokenPosition(user: Address, event: Transfer, pool: Pool): void {
  const userPosition = updateUserBalance(user, BigInt.zero());

  const lToken = ShoebillSbToken.bind(event.address);
  let poolBalance = lToken.getCash();

  pool.balance = poolBalance;
  pool.totalSupplied = lToken.totalSupply();
  pool.save();

  const poolTokenPositionId = user.concat(pool.underlying).concat(pool.id);
  let poolTokenPosition = PoolTokenPosition.load(poolTokenPositionId);
  if (!poolTokenPosition) {
    poolTokenPosition = new PoolTokenPosition(poolTokenPositionId);
  }
  const supplied = lToken.balanceOf(user);
  poolTokenPosition.token = pool.underlying;
  poolTokenPosition.pool = pool.id;
  poolTokenPosition.poolName = lToken.name();
  poolTokenPosition.supplied = supplied;
  poolTokenPosition.userPosition = userPosition.id;
  poolTokenPosition.save();
}
