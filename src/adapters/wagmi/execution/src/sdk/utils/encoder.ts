import { Interface } from 'ethers';
import PoolAbi from '../abis/Pool.json';
import FactoryMultipoolAbi from '../abis/FactoryMultipool.json';
import MultipoolDispatcherAbi from '../abis/MultipoolDispatcher.json';

export const encodeSlot0 = (): string => {
  const iface = new Interface(PoolAbi);

  return iface.encodeFunctionData('slot0');
};

export const decodeSlot0 = (data: string): string[] => {
  const iface = new Interface(PoolAbi);

  return iface.decodeFunctionResult('slot0', data);
};

export const encodeEstimateWithdrawalAmounts = (tokenAAddress: string, tokenBAddress: string, amount: bigint): string => {
  const iface = new Interface(FactoryMultipoolAbi);

  return iface.encodeFunctionData('estimateWithdrawalAmounts', [tokenAAddress, tokenBAddress, amount]);
};

export const decodeEstimateWithdrawalAmounts = (data: string): string[] => {
  const iface = new Interface(FactoryMultipoolAbi);

  return iface.decodeFunctionResult('estimateWithdrawalAmounts', data);
};

export const encodeEstimateClaim = (pid: bigint, userAddress: string): string => {
  const iface = new Interface(MultipoolDispatcherAbi);

  return iface.encodeFunctionData('estimateClaim', [pid, userAddress]);
};

export const decodeEstimateClaim = (data: string): string[] => {
  const iface = new Interface(MultipoolDispatcherAbi);

  return iface.decodeFunctionResult('estimateClaim', data);
};