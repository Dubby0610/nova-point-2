import { Address } from "@graphprotocol/graph-ts";
import { MultipoolPosition, Multipool } from '../../../generated/schema';
import { BIGINT_ZERO  } from '../../constants';

export function getOrCreateMultipoolPosition(userAddress: Address, multipool: Multipool): MultipoolPosition {
  let multipoolPosition = MultipoolPosition.load(userAddress.toHexString() + "-" + multipool.id);
  if (multipoolPosition == null) {
    multipoolPosition = new MultipoolPosition(userAddress.toHexString() + "-" + multipool.id);
    multipoolPosition.owner = userAddress.toHexString();
    multipoolPosition.multipool = multipool.id;
    multipoolPosition.balance = BIGINT_ZERO;
    multipoolPosition.staked = BIGINT_ZERO;
    multipoolPosition.save();
  }
  return multipoolPosition as MultipoolPosition;
}