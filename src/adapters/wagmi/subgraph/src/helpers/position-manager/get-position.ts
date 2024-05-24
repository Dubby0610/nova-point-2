import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { NonfungiblePositionManager } from '../../../generated/NonfungiblePositionManager/NonfungiblePositionManager';
import { Position } from '../../../generated/schema';
import { ADDRESS_ZERO, BIGINT_ZERO, V3_FACTORY_ADDRESS } from '../../constants';
import { Factory as FactoryContract } from '../../../generated/templates/Pool/Factory';

export function getPosition(event: ethereum.Event, tokenId: BigInt): Position | null {
    let position = Position.load(tokenId.toString());
    if (position === null) {
        let contract = NonfungiblePositionManager.bind(event.address);
        let positionCall = contract.try_positions(tokenId);

        if (!positionCall.reverted) {
            let positionResult = positionCall.value;
            const factoryContract = FactoryContract.bind(Address.fromString(V3_FACTORY_ADDRESS));
            let poolAddress = factoryContract.getPool(positionResult.value2, positionResult.value3, positionResult.value4);

            position = new Position(tokenId.toString());
            // The owner gets correctly updated in the Transfer handler
            position.owner = ADDRESS_ZERO.toHexString();
            position.pool = poolAddress.toHexString();
            position.token0 = positionResult.value2.toHexString();
            position.token1 = positionResult.value3.toHexString();
            position.tickLower = positionResult.value5;
            position.tickUpper = positionResult.value6;
            position.liquidity = BIGINT_ZERO;
        }
    }

    return position;
}
