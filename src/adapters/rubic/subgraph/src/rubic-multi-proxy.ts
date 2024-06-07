import {
  RubicSwappedGeneric as RubicSwappedGenericEvent,
} from "../generated/RubicMultiProxy/RubicMultiProxy"
import {
  RubicSwappedGeneric,
} from "../generated/schema"

export function handleRubicSwappedGeneric(
  event: RubicSwappedGenericEvent
): void {
  let entity = new RubicSwappedGeneric(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.transactionId = event.params.transactionId
  entity.integrator = event.params.integrator
  entity.referrer = event.params.referrer
  entity.fromAssetId = event.params.fromAssetId
  entity.toAssetId = event.params.toAssetId
  entity.fromAmount = event.params.fromAmount
  entity.toAmount = event.params.toAmount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
