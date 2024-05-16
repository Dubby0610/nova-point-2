import {
  RubicSwappedGeneric as RubicSwappedGenericEvent,
  RubicTransferStarted as RubicTransferStartedEvent,
} from "../generated/RubicMultiProxy/RubicMultiProxy"
import {
  RubicSwappedGeneric,
  RubicTransferStarted,
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

export function handleRubicTransferStarted(
  event: RubicTransferStartedEvent
): void {
  let entity = new RubicTransferStarted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.bridgeData_transactionId = event.params.bridgeData.transactionId
  entity.bridgeData_bridge = event.params.bridgeData.bridge
  entity.bridgeData_integrator = event.params.bridgeData.integrator
  entity.bridgeData_referrer = event.params.bridgeData.referrer
  entity.bridgeData_sendingAssetId = event.params.bridgeData.sendingAssetId
  entity.bridgeData_receivingAssetId = event.params.bridgeData.receivingAssetId
  entity.bridgeData_receiver = event.params.bridgeData.receiver
  entity.bridgeData_refundee = event.params.bridgeData.refundee
  entity.bridgeData_minAmount = event.params.bridgeData.minAmount
  entity.bridgeData_destinationChainId =
    event.params.bridgeData.destinationChainId
  entity.bridgeData_hasSourceSwaps = event.params.bridgeData.hasSourceSwaps
  entity.bridgeData_hasDestinationCall =
    event.params.bridgeData.hasDestinationCall

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
