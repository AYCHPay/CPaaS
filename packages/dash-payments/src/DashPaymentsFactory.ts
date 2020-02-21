import { PaymentsFactory } from '@faast/payments-common'

import { DashPaymentsConfig, HdDashPaymentsConfig } from './types'
import { HdDashPayments } from './HdDashPayments'

export class DashPaymentsFactory implements PaymentsFactory<DashPaymentsConfig> {
  forConfig(config: DashPaymentsConfig) {
    if (HdDashPaymentsConfig.is(config)) {
      return new HdDashPayments(config)
    }
    throw new Error('Cannot instantiate dash payments for unsupported config')
  }
}

export default DashPaymentsFactory
