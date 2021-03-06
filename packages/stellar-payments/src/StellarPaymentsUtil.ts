import { PaymentsUtils, Payport } from '@faast/payments-common'

import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidAddress,
  isValidExtraId,
} from './helpers'
import { isNil, assertType, Numeric } from '@faast/ts-common'
import { StellarConnected } from './StellarConnected';

export class StellarPaymentsUtils extends StellarConnected implements PaymentsUtils {

  async isValidExtraId(extraId: string): Promise<boolean> {
    return isValidExtraId(extraId)
  }

  async isValidAddress(address: string): Promise<boolean> {
    return isValidAddress(address)
  }

  async _getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    const { address, extraId } = payport
    if (!(await this.isValidAddress(address))) {
      return 'Invalid payport address'
    }
    if (!isNil(extraId) && !(await this.isValidExtraId(extraId))) {
      return 'Invalid payport extraId'
    }
  }

  async getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    try {
      payport = assertType(Payport, payport, 'payport')
    } catch (e) {
      return e.message
    }
    return this._getPayportValidationMessage(payport)
  }

  async validatePayport(payport: Payport): Promise<void> {
    assertType(Payport, payport, 'payport')
    const message = await this._getPayportValidationMessage(payport)
    if (message) {
      throw new Error(message)
    }
  }

  async isValidPayport(payport: Payport): Promise<boolean> {
    if (!Payport.is(payport)) {
      return false
    }
    return !(await this._getPayportValidationMessage(payport))
  }

  toMainDenomination(amount: Numeric): string {
    return toMainDenominationString(amount)
  }

  toBaseDenomination(amount: Numeric): string {
    return toBaseDenominationString(amount)
  }

}
