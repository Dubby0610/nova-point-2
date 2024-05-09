import { Interface } from 'ethers';
import STABLECOIN_FARM_ABI from '../abis/stablecoin-farm.json';


export const encodeUserInfo = (pid: string, userAddress: string): string => {
  const iface = new Interface(STABLECOIN_FARM_ABI);

  return iface.encodeFunctionData('userInfo', [pid, userAddress]);
};

export const decodeUserInfo = (data: string): string[] => {
  const iface = new Interface(STABLECOIN_FARM_ABI);

  return iface.decodeFunctionResult('userInfo', data);
};
