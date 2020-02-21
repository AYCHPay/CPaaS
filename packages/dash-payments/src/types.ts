import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, FeeRate,
  BaseTransactionInfo, BaseBroadcastResult, UtxoInfo,
} from '@faast/payments-common'
import { extendCodec, enumCodec } from '@faast/ts-common'
import { Network as DashjsNetwork } from 'bitcoinjs-lib'
import { BlockInfoBitcoin } from 'blockbook-client'
import { BitcoinishPaymentTx, BlockbookConfigServer } from '../../bitcoin-payments/src/bitcoinish'

export { DashjsNetwork, UtxoInfo }
export * from '../../bitcoin-payments/src/bitcoinish/types'

export enum AddressType {
  Legacy = 'p2pkh',
  SegwitP2SH = 'p2sh-p2wpkh',
  SegwitNative = 'p2wpkh',
}
export const AddressTypeT = enumCodec<AddressType>(AddressType, 'AddressType')

export const DashPaymentsUtilsConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: BlockbookConfigServer,
  },
  'DashPaymentsUtilsConfig',
)
export type DashPaymentsUtilsConfig = t.TypeOf<typeof DashPaymentsUtilsConfig>

export const BaseDashPaymentsConfig = extendCodec(
  DashPaymentsUtilsConfig,
  {},
  {
    addressType: AddressTypeT,
    minTxFee: FeeRate,
    dustThreshold: t.number,
    networkMinRelayFee: t.number,
  },
  'BaseDashPaymentsConfig',
)
export type BaseDashPaymentsConfig = t.TypeOf<typeof BaseDashPaymentsConfig>

export const HdDashPaymentsConfig = extendCodec(
  BaseDashPaymentsConfig,
  {
    hdKey: t.string,
  },
  {
    derivationPath: t.string,
  },
  'HdDashPaymentsConfig',
)
export type HdDashPaymentsConfig = t.TypeOf<typeof HdDashPaymentsConfig>

// TODO: Add KeyPairBitcoinPaymentsConfig as a union to this once it exists
export const DashPaymentsConfig = HdDashPaymentsConfig
export type DashPaymentsConfig = t.TypeOf<typeof DashPaymentsConfig>

export const DashUnsignedTransactionData = BitcoinishPaymentTx
export type DashUnsignedTransactionData = t.TypeOf<typeof DashUnsignedTransactionData>

export const DashUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
    data: DashUnsignedTransactionData,
  },
  'DashUnsignedTransaction',
)
export type DashUnsignedTransaction = t.TypeOf<typeof DashUnsignedTransaction>

export const DashSignedTransaction = extendCodec(BaseSignedTransaction, {
  data: t.type({
    hex: t.string,
  }),
}, {}, 'DashSignedTransaction')
export type DashSignedTransaction = t.TypeOf<typeof DashSignedTransaction>

export const DashTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'DashTransactionInfo')
export type DashTransactionInfo = t.TypeOf<typeof DashTransactionInfo>

export const DashBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'DashBroadcastResult')
export type DashBroadcastResult = t.TypeOf<typeof DashBroadcastResult>

export const DashBlock = BlockInfoBitcoin
export type BitcoinBlock = BlockInfoBitcoin
