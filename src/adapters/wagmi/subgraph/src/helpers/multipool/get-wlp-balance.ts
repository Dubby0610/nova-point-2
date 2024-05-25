import { Address, BigInt } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../../generated/templates/Multipool/ERC20";

export function getWlpBalance(userAddress: Address, wlpAddress: Address): BigInt {
  let wlpToken = ERC20.bind(wlpAddress);
  return wlpToken.balanceOf(userAddress);
}