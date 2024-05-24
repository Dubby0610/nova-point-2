import { Interface } from 'ethers';
import PoolAbi from '../abis/Pool.json';

export const encodeSlot0 = (): string => {
  const iface = new Interface(PoolAbi);

  return iface.encodeFunctionData('slot0');
};

export const decodeSlot0 = (data: string): string[] => {
  const iface = new Interface(PoolAbi);

  return iface.decodeFunctionResult('slot0', data);
};
