import { FeeLevel, NetworkType, FeeRateType } from '@faast/payments-common'
import { networks } from 'bitgo-utxo-lib'
import { AddressType, BitcoinishPaymentsConfig } from './types'

export const PACKAGE_NAME = 'dash-payments'
export const DECIMAL_PLACES = 8
export const COIN_SYMBOL = 'DASH'
export const COIN_NAME = 'Dash'

/**
 * The minimum value a transaction output must be in order to not get rejected by the network.
 *
 * Unit: `satoshis`
 */
export const DEFAULT_DUST_THRESHOLD = 546

/**
 * The minimum fee required by *most* nodes to relay a transaction.
 *
 * Unit: `satoshis`
 */
export const DEFAULT_NETWORK_MIN_RELAY_FEE = 1000

/**
 * The minimum fee this library should ever use for a transaction (overrides recommended levels).
 *
 * Unit: `sat/byte`
 */
export const DEFAULT_MIN_TX_FEE = 5

export const DEFAULT_ADDRESS_TYPE: AddressType = AddressType.SegwitNative

export const DEFAULT_DERIVATION_PATHS = {
  [AddressType.Legacy]: "m/44'/5'/0'",
  [AddressType.SegwitP2SH]: "m/49'/5'/0'",
  [AddressType.SegwitNative]: "m/84'/5'/0'",
}

export const DEFAULT_NETWORK = NetworkType.Mainnet

export const NETWORK_MAINNET = networks.dash
export const NETWORK_TESTNET = networks.dashTest

export const DEFAULT_MAINNET_SERVER = process.env.DASH_SERVER_URL || 'https://dash1.trezor.io/'
export const DEFAULT_TESTNET_SERVER = process.env.DASH_TESTNET_SERVER_URL || 'https://tbtc1.trezor.io'

export const DEFAULT_FEE_LEVEL = FeeLevel.Medium
export const DEFAULT_SAT_PER_BYTE_LEVELS = {
  [FeeLevel.High]: 50,
  [FeeLevel.Medium]: 25,
  [FeeLevel.Low]: 10,
}
