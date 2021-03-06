import { NetworkType, isMatchingError } from '@faast/payments-common';
import promiseRetry from 'promise-retry';
import { isString, isObject, isNil } from '@faast/ts-common';
import { StellarServerAPI } from './types';
import { DEFAULT_TESTNET_SERVER, DEFAULT_MAINNET_SERVER } from './constants';
import { omitBy, isFunction } from 'lodash';
export { isMatchingError };
export function serializePayport(payport) {
    return isNil(payport.extraId) ? payport.address : `${payport.address}/${payport.extraId}`;
}
export function omitHidden(o) {
    return omitBy(o, (_, k) => k.startsWith('_'));
}
export function isStellarLedger(x) {
    return isObject(x) && x.hasOwnProperty('successful_transaction_count');
}
export function isStellarTransaction(x) {
    return isObject(x) && x.hasOwnProperty('source_account');
}
export function isStellarTransactionRecord(x) {
    return isObject(x) && isFunction(x.ledger);
}
export function padLeft(x, n, v) {
    while (x.length < n) {
        x = `${v}${x}`;
    }
    return x;
}
export function resolveStellarServer(server, network) {
    if (typeof server === 'undefined') {
        server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER;
    }
    if (isString(server)) {
        return {
            api: new StellarServerAPI(server),
            server,
        };
    }
    else if (server instanceof StellarServerAPI) {
        return {
            api: server,
            server: server.serverURL.toString(),
        };
    }
    else {
        return {
            api: null,
            server: null,
        };
    }
}
const RETRYABLE_ERRORS = ['timeout', 'disconnected'];
const MAX_RETRIES = 3;
export function retryIfDisconnected(fn, stellarApi, logger) {
    return promiseRetry((retry, attempt) => {
        return fn().catch(async (e) => {
            if (isMatchingError(e, RETRYABLE_ERRORS)) {
                logger.log(`Retryable error during stellar server call, retrying ${MAX_RETRIES - attempt} more times`, e.toString());
                retry(e);
            }
            throw e;
        });
    }, {
        retries: MAX_RETRIES,
    });
}
//# sourceMappingURL=utils.js.map