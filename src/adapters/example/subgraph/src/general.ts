import { Address, BigInt } from "@graphprotocol/graph-ts"
import { UserPosition } from "../generated/schema"


// using for erc20 transfer event
export function updateUserBalance(user: Address, balance: BigInt): UserPosition {
    let userPosition = UserPosition.load(user)
    if (!userPosition) {
        userPosition = new UserPosition(user)
        userPosition.invalid = false
    }
    userPosition.balance = balance
    userPosition.save()

    return userPosition
}

// using for setting contract address invalid
export function setUserInvalid(user: Address): UserPosition {
    let userPosition = UserPosition.load(user)
    if (!userPosition) {
        userPosition = new UserPosition(user)
    }
    userPosition.balance = BigInt.zero()
    userPosition.invalid = true
    userPosition.save()

    return userPosition
}

