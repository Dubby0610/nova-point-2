import {
    EddySwap as EddySwapEvent,
    OwnershipTransferred as OwnershipTransferredEvent
  } from "../generated/EddySwapRouter/EddySwapRouter"
  import { EddySwap, OwnershipTransferred } from "../generated/schema"
  
  export function handleEddySwap(event: EddySwapEvent): void {
    let entity = new EddySwap(
      event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.walletAddress = event.params.walletAddress
    entity.tokenIn = event.params.tokenIn
    entity.tokenOut = event.params.tokenOut
    entity.amountIn = event.params.amountIn
    entity.amountOut = event.params.amountOut
    entity.fees = event.params.fees
    entity.chainId = event.params.chainId
    entity.aggregator = event.params.aggregator.toString()
    entity.priceOfTokenIn = event.params.priceOfTokenIn
  
    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash
  
    entity.save()
  }
  
  export function handleOwnershipTransferred(
    event: OwnershipTransferredEvent
  ): void {
    let entity = new OwnershipTransferred(
      event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.previousOwner = event.params.previousOwner
    entity.newOwner = event.params.newOwner
  
    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash
  
    entity.save()
  }
  