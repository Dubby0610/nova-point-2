import { Staked } from '../generated/StablecoinFarm/StablecoinFarm'
import { UserStake } from '../generated/schema'

export function handleStaked(event: Staked): void {
  const id = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  let stake = new UserStake(id);

  stake.user = event.params.user;
  stake.pid = event.params.pid;
  stake.amount = event.params.amount;
  stake.timestamp = event.block.timestamp;
  stake.blocknumber = event.block.number;

  stake.save();
}
