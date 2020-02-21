import { BitcoinishPaymentsUtils } from '../../bitcoin-payments/src/bitcoinish'
import { toBitcoinishConfig } from './utils'
import { DashPaymentsUtilsConfig } from './types'
import { isValidAddress, isValidPrivateKey } from './helpers'

export class DashPaymentsUtils extends BitcoinishPaymentsUtils {
  constructor(config: DashPaymentsUtilsConfig = {}) {
    super(toBitcoinishConfig(config))
  }

  async isValidAddress(address: string) {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  async isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

}
