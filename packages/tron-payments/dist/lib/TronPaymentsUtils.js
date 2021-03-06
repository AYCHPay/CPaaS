import { NetworkType, Payport } from '@faast/payments-common';
import { toMainDenominationString, toBaseDenominationString, isValidXprv, isValidXpub, isValidAddress, isValidExtraId, isValidPrivateKey, privateKeyToAddress, } from './helpers';
import { DelegateLogger, isNil, assertType } from '@faast/ts-common';
import { PACKAGE_NAME } from './constants';
import { BaseTronPaymentsConfig } from './types';
export class TronPaymentsUtils {
    constructor(config = {}) {
        this.isValidXprv = isValidXprv;
        this.isValidXpub = isValidXpub;
        this.isValidPrivateKey = isValidPrivateKey;
        this.privateKeyToAddress = privateKeyToAddress;
        assertType(BaseTronPaymentsConfig, config);
        this.networkType = config.network || NetworkType.Mainnet;
        this.logger = new DelegateLogger(config.logger, PACKAGE_NAME);
    }
    async isValidExtraId(extraId) {
        return isValidExtraId(extraId);
    }
    async isValidAddress(address) {
        return isValidAddress(address);
    }
    async _getPayportValidationMessage(payport) {
        const { address, extraId } = payport;
        if (!isValidAddress(address)) {
            return 'Invalid payport address';
        }
        if (!isNil(extraId) && !isValidExtraId(extraId)) {
            return 'Invalid payport extraId';
        }
    }
    async getPayportValidationMessage(payport) {
        try {
            payport = assertType(Payport, payport, 'payport');
        }
        catch (e) {
            return e.message;
        }
        return this._getPayportValidationMessage(payport);
    }
    async validatePayport(payport) {
        payport = assertType(Payport, payport, 'payport');
        const message = await this._getPayportValidationMessage(payport);
        if (message) {
            throw new Error(message);
        }
    }
    async isValidPayport(payport) {
        return Payport.is(payport) && !(await this._getPayportValidationMessage(payport));
    }
    toMainDenomination(amount) {
        return toMainDenominationString(amount);
    }
    toBaseDenomination(amount) {
        return toBaseDenominationString(amount);
    }
}
//# sourceMappingURL=TronPaymentsUtils.js.map