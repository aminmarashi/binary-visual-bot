import { getUTCTime } from 'binary-common-utils/lib/tools';
import { translate } from '../../common/i18n';
import { notify } from './broadcast';

export const noop = () => {};

const castBarrierToString = barrier => (barrier > 0 ? `+${barrier}` : `${barrier}`);

export const tradeOptionToProposal = tradeOption =>
    tradeOption.contractTypes.map(type => ({
        duration_unit: tradeOption.duration_unit,
        basis        : 'stake',
        currency     : tradeOption.currency,
        symbol       : tradeOption.symbol,
        duration     : tradeOption.duration,
        amount       : tradeOption.amount.toFixed(2),
        contract_type: type,
        ...(tradeOption.prediction !== undefined && {
            barrier: tradeOption.prediction,
        }),
        ...(tradeOption.barrierOffset !== undefined && {
            barrier: castBarrierToString(tradeOption.barrierOffset),
        }),
        ...(tradeOption.secondBarrierOffset !== undefined && {
            barrier2: castBarrierToString(tradeOption.secondBarrierOffset),
        }),
    }));

export const getDirection = ticks => {
    const length = ticks.length;
    const [tick1, tick2] = ticks.slice(-2);

    let direction = '';
    if (length >= 2) {
        direction = tick1.quote > tick2.quote ? 'rise' : direction;
        direction = tick1.quote < tick2.quote ? 'fall' : direction;
    }

    return direction;
};

export const subscribeToStream = (observer, name, respHandler, request, registerOnce, type, unregister) =>
    new Promise(resolve => {
        observer.register(
            name,
            (...args) => {
                respHandler(...args);
                resolve();
            },
            registerOnce,
            type && { type, unregister },
            true
        );
        request();
    });

export const registerStream = (observer, name, cb) => {
    if (observer.isRegistered(name)) {
        return;
    }
    observer.register(name, cb);
};

const maxRetries = 12;

const notifyRetry = (msg, error, delay) =>
    notify('warn', `${msg}: ${error.error.msg_type}, ${translate('retrying in')} ${delay}s`);

const getBackoffDelay = (error, delayIndex) => {
    const offset = 0.5; // 500ms

    const errorCode = error && error.name;

    if (errorCode === 'DisconnectError') {
        return offset * 1000;
    }

    const maxExpTries = 4;
    const exponentialIncrease = 2 ** delayIndex + offset;

    if (errorCode === 'RateLimit' || delayIndex < maxExpTries) {
        notifyRetry(translate('Rate limit reached for'), error, exponentialIncrease);
        return exponentialIncrease * 1000;
    }

    const linearIncrease = exponentialIncrease + (maxExpTries - delayIndex + 1);

    notifyRetry(translate('Request failed for'), error, linearIncrease);
    return linearIncrease * 1000;
};

export const shouldThrowError = (e, types = [], delayIndex = 0) =>
    e &&
    (!types
        .concat(['CallError', 'WrongResponse', 'GetProposalFailure', 'RateLimit', 'DisconnectError'])
        .includes(e.name) ||
        (e.name !== 'DisconnectError' && delayIndex > maxRetries));

export const recoverFromError = (f, r, types, delayIndex) =>
    new Promise((resolve, reject) => {
        const promise = f();

        if (!promise) {
            resolve();
            return;
        }

        promise.then(resolve).catch(e => {
            if (shouldThrowError(e, types, delayIndex)) {
                reject(e);
                return;
            }

            r(e.name, () => new Promise(delayPromise => setTimeout(delayPromise, getBackoffDelay(e, delayIndex))));
        });
    });

export const doUntilDone = (f, types) => {
    let delayIndex = 0;

    return new Promise((resolve, reject) => {
        const repeat = () => {
            recoverFromError(f, (errorCode, makeDelay) => makeDelay().then(repeat), types, delayIndex++)
                .then(resolve)
                .catch(reject);
        };
        repeat();
    });
};

const toFixedTwo = num => +num.toFixed(2);

export const addFixed = (a, b) => toFixedTwo(+a + +b);

export const subtractFixed = (a, b) => toFixedTwo(+a - +b);

export const createDetails = contract => {
    const profit = subtractFixed(contract.sell_price, contract.buy_price);
    const result = profit < 0 ? 'loss' : 'win';

    return [
        contract.transaction_ids.buy,
        +contract.buy_price,
        +contract.sell_price,
        profit,
        contract.contract_type,
        getUTCTime(new Date(parseInt(`${contract.entry_tick_time}000`))),
        +contract.entry_tick,
        getUTCTime(new Date(parseInt(`${contract.exit_tick_time}000`))),
        +contract.exit_tick,
        +(contract.barrier ? contract.barrier : 0),
        result,
    ];
};

export const getUUID = () => `${new Date().getTime() * Math.random()}`;
