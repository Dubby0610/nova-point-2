import { DecreaseLiquidity, IncreaseLiquidity, Transfer } from '../../generated/NonfungiblePositionManager/NonfungiblePositionManager';
import { getPosition } from '../helpers/position-manager/get-position';

export function handleIncreaseLiquidity(event: IncreaseLiquidity): void {
    let position = getPosition(event, event.params.tokenId);
    if (position == null) return;

    position.liquidity = position.liquidity.plus(event.params.liquidity);
    position.save();
}

export function handleDecreaseLiquidity(event: DecreaseLiquidity): void {
    const position = getPosition(event, event.params.tokenId);
    if (position == null) return;

    position.liquidity = position.liquidity.minus(event.params.liquidity);
    position.save();
}

export function handleTransfer(event: Transfer): void {
    const position = getPosition(event, event.params.tokenId);
    if (position == null) return;

    position.owner = event.params.to.toHexString()  ;
    position.save();
}
