import { BasePayments, UtxoInfo, FeeRate, FeeOption, ResolvedFeeOption, AutoFeeLevels, Payport, ResolveablePayport, BalanceResult, FromTo, CreateTransactionOptions, BaseConfig } from '@faast/payments-common';
import { Numeric } from '@faast/ts-common';
import { BitcoinishUnsignedTransaction, BitcoinishSignedTransaction, BitcoinishBroadcastResult, BitcoinishTransactionInfo, BitcoinishPaymentsConfig, BitcoinishPaymentTx, BitcoinishTxOutput, PayportOutput } from './types';
import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils';
export declare abstract class BitcoinishPayments<Config extends BaseConfig> extends BitcoinishPaymentsUtils implements BasePayments<Config, BitcoinishUnsignedTransaction, BitcoinishSignedTransaction, BitcoinishBroadcastResult, BitcoinishTransactionInfo> {
    coinSymbol: string;
    coinName: string;
    minTxFee?: FeeRate;
    dustThreshold: number;
    networkMinRelayFee: number;
    isSegwit: boolean;
    defaultFeeLevel: AutoFeeLevels;
    targetUtxoPoolSize: number;
    minChangeSat: number;
    constructor(config: BitcoinishPaymentsConfig);
    abstract getFullConfig(): Config;
    abstract getPublicConfig(): Config;
    abstract getAccountId(index: number): string;
    abstract getAccountIds(): string[];
    abstract getAddress(index: number): string;
    abstract getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate>;
    abstract isValidAddress(address: string): Promise<boolean>;
    abstract signTransaction(tx: BitcoinishUnsignedTransaction): Promise<BitcoinishSignedTransaction>;
    init(): Promise<void>;
    destroy(): Promise<void>;
    requiresBalanceMonitor(): boolean;
    isSweepableBalance(balance: Numeric): boolean;
    getPayport(index: number): Promise<Payport>;
    resolvePayport(payport: ResolveablePayport): Promise<Payport>;
    resolveFeeOption(feeOption: FeeOption): Promise<ResolvedFeeOption>;
    getBalance(payport: ResolveablePayport): Promise<BalanceResult>;
    usesUtxos(): boolean;
    getUtxos(payport: ResolveablePayport): Promise<UtxoInfo[]>;
    usesSequenceNumber(): boolean;
    getNextSequenceNumber(): Promise<null>;
    resolveFromTo(from: number, to: ResolveablePayport): Promise<FromTo>;
    private convertOutputsToExternalFormat;
    private feeRateToSatoshis;
    private calculateTxFeeSatoshis;
    private selectInputUtxos;
    buildPaymentTx(params: {
        unusedUtxos: UtxoInfo[];
        desiredOutputs: BitcoinishTxOutput[];
        changeAddress: string;
        desiredFeeRate: FeeRate;
        useAllUtxos?: boolean;
        useUnconfirmedUtxos?: boolean;
    }): Promise<Required<BitcoinishPaymentTx>>;
    private createWeightedChangeOutputs;
    createTransaction(from: number, to: ResolveablePayport, amount: Numeric, options?: CreateTransactionOptions): Promise<BitcoinishUnsignedTransaction>;
    createMultiOutputTransaction(from: number, to: PayportOutput[], options?: CreateTransactionOptions): Promise<BitcoinishUnsignedTransaction>;
    createSweepTransaction(from: number, to: ResolveablePayport, options?: CreateTransactionOptions): Promise<BitcoinishUnsignedTransaction>;
    broadcastTransaction(tx: BitcoinishSignedTransaction): Promise<BitcoinishBroadcastResult>;
    getTransactionInfo(txId: string): Promise<BitcoinishTransactionInfo>;
}
