import { FallbackProvider, JsonRpcProvider } from 'ethers';
import { BACKUP_RPC_URL, RPC_URL } from './constants';

export function createFallbackProvider(): FallbackProvider {
  const mainProvider = new JsonRpcProvider(RPC_URL);
  const backupProvider = new JsonRpcProvider(BACKUP_RPC_URL);

  return new FallbackProvider([mainProvider, backupProvider]);
}
