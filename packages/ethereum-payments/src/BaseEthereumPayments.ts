import { BigNumber } from 'bignumber.js'
import { Transaction as Tx } from 'ethereumjs-tx'
import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core';
import { Eth } from 'web3-eth'
import { cloneDeep } from 'lodash'
import {
  BalanceResult,
  BasePayments,
  TransactionStatus,
  FeeLevel,
  FeeOption,
  FeeRateType,
  FeeOptionCustom,
  Payport,
  FromTo,
  ResolveablePayport,
  PaymentsError,
  PaymentsErrorCode,
  CreateTransactionOptions as TransactionOptions,
  NetworkType,
} from '@faast/payments-common'
import { isType } from '@faast/ts-common'

import {
  EthereumTransactionInfo,
  EthereumUnsignedTransaction,
  EthereumSignedTransaction,
  EthereumBroadcastResult,
  BaseEthereumPaymentsConfig,
  EthereumResolvedFeeOption,
} from './types'
import { NetworkData } from './NetworkData'
import {
// TODO use them
//  DEFAULT_FULL_NODE,
//  DEFAULT_SOLIDITY_NODE,
  DEFAULT_FEE_LEVEL,
  FEE_LEVEL_MAP,
  ETHEREUM_TRANSFER_COST,
  MIN_CONFIRMATIONS,
} from './constants'
import { EthereumPaymentsUtils } from './EthereumPaymentsUtils'

export abstract class BaseEthereumPayments
  <Config extends BaseEthereumPaymentsConfig>
  extends EthereumPaymentsUtils
implements BasePayments
  <Config, EthereumUnsignedTransaction, EthereumSignedTransaction, EthereumBroadcastResult, EthereumTransactionInfo> {
  private eth: Eth
  private gasStation: NetworkData
  private config: Config

  constructor(config: Config) {
    super(config)

    this.config = config
    this.eth = (new (Web3 as any )(config.fullNode, null, { transactionConfirmationBlocks: MIN_CONFIRMATIONS })).eth
    this.gasStation = new NetworkData(config.gasStation, config.parityNode, config.fullNode)
  }

  // XXX Violates Interface Segregation Principle
  async init() {}
  async destroy() {}

  getFullConfig(): Config {
    return this.config
  }

  abstract getPublicConfig(): Config

  async resolvePayport(payport: ResolveablePayport): Promise<Payport> {
    // NOTE: this type of nesting suggests to revise payport as an abstraction
    if (typeof payport === 'number') {
      return this.getPayport(payport)
    } else if (typeof payport === 'string') {
      if (!await this.isValidAddress(payport)) {
        throw new Error(`Invalid Ethereum address: ${payport}`)
      }
      return { address: payport }
    }

    if (!await this.isValidPayport(payport)) {
      throw new Error(`Invalid Ethereum payport: ${JSON.stringify(payport)}`)
    } else {
      if(!await this.isValidAddress(payport.address)) {
        throw new Error(`Invalid Ethereum payport: ${JSON.stringify(payport)}`)
      }
    }
    return payport
  }

  async resolveFromTo(from: number, to: ResolveablePayport): Promise<FromTo> {
    const fromPayport = await this.getPayport(from)
    const toPayport = await this.resolvePayport(to)
    return {
      fromAddress: fromPayport.address,
      fromIndex: from,
      fromExtraId: fromPayport.extraId,
      fromPayport,
      toAddress: toPayport.address,
      toIndex: typeof to === 'number' ? to : null,
      toExtraId: toPayport.extraId,
      toPayport,
    }
  }

  async resolveFeeOption(feeOption: FeeOption): Promise<EthereumResolvedFeeOption> {
    return isType(FeeOptionCustom, feeOption)
      ? this.resolveCustomFeeOption(feeOption)
      : this.resolveLeveledFeeOption(feeOption)
  }

  private resolveCustomFeeOption(feeOption: FeeOptionCustom): EthereumResolvedFeeOption {
    const isWeight = (feeOption.feeRateType === FeeRateType.BasePerWeight)
    const isMain = (feeOption.feeRateType === FeeRateType.Main)

    const gasPrice = isWeight
      ? feeOption.feeRate
      : (new BigNumber(feeOption.feeRate)).dividedBy(ETHEREUM_TRANSFER_COST).toString()
    const fee = isWeight
      ? (new BigNumber(feeOption.feeRate)).multipliedBy(ETHEREUM_TRANSFER_COST).toString()
      : feeOption.feeRate

    return {
      targetFeeRate:     feeOption.feeRate,
      targetFeeLevel:    FeeLevel.Custom,
      targetFeeRateType: feeOption.feeRateType,
      feeBase:           isMain ? this.toBaseDenomination(fee) : fee,
      feeMain:           isMain ? fee : this.toMainDenomination(fee),
      gasPrice:          isMain ? this.toBaseDenomination(gasPrice, { rounding: 7 }) : gasPrice
    }
  }

  private async resolveLeveledFeeOption(feeOption: FeeOption): Promise<EthereumResolvedFeeOption> {
    const targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
    const targetFeeRate = await this.gasStation.getGasPrice(FEE_LEVEL_MAP[targetFeeLevel])
    const feeBase = (new BigNumber(targetFeeRate)).multipliedBy(ETHEREUM_TRANSFER_COST).toString()

    return {
      targetFeeRate,
      targetFeeLevel,
      targetFeeRateType: FeeRateType.BasePerWeight,
      feeBase,
      feeMain: this.toMainDenomination(feeBase),
      gasPrice: targetFeeRate,
    }
  }

  abstract getAccountIds(): string[]

  abstract getAccountId(index: number): string

  requiresBalanceMonitor() {
    return false
  }

  async getAvailableUtxos() {
    return []
  }

  async getUtxos() {
    return []
  }

  usesSequenceNumber() {
    return true
  }

  usesUtxos() {
    return false
  }

  abstract async getPayport(index: number): Promise<Payport>

  async getBalance(resolveablePayport: ResolveablePayport): Promise<BalanceResult> {
    const payport = await this.resolvePayport(resolveablePayport)
    const balance = await this.eth.getBalance(payport.address)
    const sweepable = await this.isSweepableBalance(balance)

    return {
      confirmedBalance: this.toMainDenomination(balance),
      unconfirmedBalance: '0',
      sweepable,
    }
  }

  async isSweepableBalance(balanceEth: string): Promise<boolean> {
    const feeOption = await this.resolveFeeOption({})

    const feeWei = new BigNumber(feeOption.feeBase)
    const balanceWei = new BigNumber(this.toBaseDenomination(balanceEth))

    if (balanceWei.minus(feeWei).isLessThanOrEqualTo(0)) {
      return false
    }
    return true
  }

  async getNextSequenceNumber(payport: ResolveablePayport) {
    const resolvedPayport = await this.resolvePayport(payport)
    const sequenceNumber = await this.gasStation.getNonce(resolvedPayport.address)

    return sequenceNumber
  }

  async getTransactionInfo(txid: string): Promise<EthereumTransactionInfo> {
    // XXX it is suggested to keep 12 confirmations
    // https://ethereum.stackexchange.com/questions/319/what-number-of-confirmations-is-considered-secure-in-ethereum
    const minConfirmations = MIN_CONFIRMATIONS
    const tx = await this.eth.getTransaction(txid)
    const currentBlockNumber = await this.eth.getBlockNumber()
    let txInfo: TransactionReceipt | null = await this.eth.getTransactionReceipt(txid)

    // NOTE: for the sake of consistent schema return
    if (!txInfo) {
      txInfo = {
        transactionHash: tx.hash,
        from: tx.from || '',
        to: tx.to || '',
        status: true,
        blockNumber: 0,
        cumulativeGasUsed: 0,
        gasUsed: parseInt(ETHEREUM_TRANSFER_COST, 10),
        transactionIndex: 0,
        blockHash: '',
        logs: [],
        logsBloom: ''
      }

      return {
        id: txid,
        amount: this.toMainDenomination(tx.value),
        toAddress: tx.to,
        fromAddress: tx.from,
        toExtraId: null,
        fromIndex: null,
        toIndex: null,
        fee: this.toMainDenomination((new BigNumber(tx.gasPrice)).multipliedBy(tx.gas)),
        sequenceNumber: tx.nonce,
        isExecuted: false,
        isConfirmed: false,
        confirmations: 0,
        confirmationId: null,
        confirmationTimestamp: null,
        status: TransactionStatus.Pending,
        data: {
          ...tx,
          ...txInfo,
          currentBlock: currentBlockNumber
        },
      }
    }

    let txBlock: any = null
    let isConfirmed = false
    let confirmationTimestamp: Date | null = null
    let confirmations = 0
    if (tx.blockNumber) {
      confirmations = currentBlockNumber - tx.blockNumber
      if (confirmations > minConfirmations) {
        isConfirmed = true
        txBlock = await this.eth.getBlock(tx.blockNumber)
        confirmationTimestamp = new Date(txBlock.timestamp)
      }
    }

    let status: TransactionStatus = TransactionStatus.Pending
    if (isConfirmed) {
      status = txInfo.status ? TransactionStatus.Confirmed : TransactionStatus.Failed
    }

    return {
      id: txid,
      amount: this.toMainDenomination(tx.value),
      toAddress: tx.to,
      fromAddress: tx.from,
      toExtraId: null,
      fromIndex: null,
      toIndex: null,
      fee: this.toMainDenomination((new BigNumber(tx.gasPrice)).multipliedBy(txInfo.gasUsed)),
      sequenceNumber: tx.nonce,
      isExecuted: txInfo.status,
      isConfirmed,
      confirmations,
      confirmationId: tx.blockHash,
      confirmationTimestamp,
      status,
      data: {
        ...tx,
        ...txInfo,
        currentBlock: currentBlockNumber
      },
    }
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amountEth: string,
    options: TransactionOptions = {},
  ): Promise<EthereumUnsignedTransaction> {
    this.logger.debug('createTransaction', from, to, amountEth)

    return this.createTransactionObject(from, to, amountEth, options)
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: TransactionOptions = {},
  ): Promise<EthereumUnsignedTransaction> {
    this.logger.debug('createSweepTransaction', from, to)

    return this.createTransactionObject(from, to, 'max', options)
  }

  async signTransaction(unsignedTx: EthereumUnsignedTransaction): Promise<EthereumSignedTransaction> {
    const fromPrivateKey = await this.getPrivateKey(unsignedTx.fromIndex)
    const payport = await this.getPayport(unsignedTx.fromIndex)

    const unsignedRaw = cloneDeep(unsignedTx.data)

    const extraParam = this.config.network === NetworkType.Testnet ?  {chain :'ropsten'} : undefined
    const tx = new Tx(unsignedRaw, extraParam)
    const key = Buffer.from(fromPrivateKey.slice(2), 'hex')
    tx.sign(key)

    return {
      ...unsignedTx,
      id: tx.hash().toString('hex'),
      status: TransactionStatus.Signed,
      data: {
        hex: '0x'+tx.serialize().toString('hex')
      }
    }
  }

  private sendTransactionWithoutConfirmation(txHex: string): Promise<string> {
    return new Promise((resolve, reject) => this.eth.sendSignedTransaction(txHex)
        .on('transactionHash', resolve)
        .on('error', reject))
  }

  async broadcastTransaction(tx: EthereumSignedTransaction): Promise<EthereumBroadcastResult> {
    if (tx.status !== TransactionStatus.Signed) {
      throw new Error(`Tx ${tx.id} has not status ${TransactionStatus.Signed}`)
    }

    try {
      const txId = await this.sendTransactionWithoutConfirmation(tx.data.hex)
      return {
        id: txId,
      }
    } catch (e) {
      this.logger.warn(`Ethereum broadcast tx unsuccessful ${tx.id}: ${e.message}`)
      if (e.message === 'nonce too low') {
        throw new PaymentsError(PaymentsErrorCode.TxSequenceCollision, e.message)
      }
      throw new Error(`Ethereum broadcast tx unsuccessful: ${tx.id} ${e.message}`)
    }
  }

  abstract async getPrivateKey(index: number): Promise<string>

  private async createTransactionObject(
    from: number,
    to: ResolveablePayport,
    amountEth: string = 'max',
    options: TransactionOptions = {}
  ): Promise<EthereumUnsignedTransaction> {
    const sweepFlag = amountEth === 'max' ? true : false

    const fromTo = await this.resolveFromTo(from, to)
    const feeOption = await this.resolveFeeOption(options as FeeOption)
    const { confirmedBalance: balanceEth } = await this.getBalance(fromTo.fromPayport)
    const nonce = options.sequenceNumber || await this.getNextSequenceNumber(from)

    const feeWei = new BigNumber(feeOption.feeBase)
    const balanceWei = this.toBaseDenomination(balanceEth)

    let amountWei: BigNumber
    if (sweepFlag) {
      amountWei = (new BigNumber(balanceWei)).minus(feeWei)
      if (amountWei.isLessThan(0)) {
        throw new Error(`Insufficient balance (${balanceEth}) to sweep with fee of ${feeOption.feeMain} `)
      }
    } else {
      amountWei = new BigNumber(this.toBaseDenomination(amountEth))
      if (amountWei.plus(feeWei).isGreaterThan(balanceWei)) {
        throw new Error(`Insufficient balance (${balanceEth}) to send ${amountEth} including fee of ${feeOption.feeMain} `)
      }
    }

    const transactionObject = {
      from:     fromTo.fromAddress,
      to:       fromTo.toAddress,
      value:    `0x${amountWei.toString(16)}`,
      gas:      `0x${(new BigNumber(ETHEREUM_TRANSFER_COST)).toString(16)}`,
      gasPrice: `0x${(new BigNumber(feeOption.gasPrice)).toString(16)}`,
      nonce:    `0x${(new BigNumber(nonce)).toString(16)}`,
    }

    return {
      status: TransactionStatus.Unsigned,
      id: '',
      fromAddress: fromTo.fromAddress,
      toAddress: fromTo.toAddress,
      toExtraId: null,
      fromIndex: fromTo.fromIndex,
      toIndex: fromTo.toIndex,
      amount: this.toMainDenomination(amountWei),
      fee: feeOption.feeMain,
      targetFeeLevel: feeOption.targetFeeLevel,
      targetFeeRate: feeOption.targetFeeRate,
      targetFeeRateType: feeOption.targetFeeRateType,
      sequenceNumber: nonce.toString(),
      data: transactionObject,
    }
  }
}

export default BaseEthereumPayments
