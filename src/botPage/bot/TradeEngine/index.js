import { Map } from 'immutable';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { translate } from '../../..//common/i18n';
import createError from '../../common/error';
import { doUntilDone } from '../tools';
import { expectInitArg, expectTradeOptions } from '../sanitize';
import Proposal from './Proposal';
import Total from './Total';
import Balance from './Balance';
import OpenContract from './OpenContract';
import Sell from './Sell';
import Purchase from './Purchase';
import Ticks from './Ticks';
import rootReducer from './state/reducers';
import * as constants from './state/constants';
import { start } from './state/actions';

const watchBefore = store =>
    watchScope({
        store,
        stopScope: constants.DURING_PURCHASE,
        passScope: constants.BEFORE_PURCHASE,
        passFlag : 'proposalsReady',
    });

const watchDuring = store =>
    watchScope({ store, stopScope: constants.STOP, passScope: constants.DURING_PURCHASE, passFlag: 'openContract' });

const watchScope = ({ store, stopScope, passScope, passFlag }) => {
    // in case watch is called after stop is fired
    if (store.getState().scope === stopScope) {
        return Promise.resolve(false);
    }
    return new Promise(resolve => {
        const unsubscribe = store.subscribe(() => {
            const newState = store.getState();

            if (newState.scope === passScope && newState[passFlag]) {
                unsubscribe();
                resolve(true);
            }

            if (newState.scope === stopScope) {
                unsubscribe();
                resolve(false);
            }
        });
    });
};

export default class TradeEngine extends Balance(Purchase(Sell(OpenContract(Proposal(Ticks(Total(class {}))))))) {
    constructor($scope) {
        super();
        this.api = $scope.api;
        this.observer = $scope.observer;
        this.$scope = $scope;
        this.observe();
        this.data = new Map();
        this.store = createStore(rootReducer, applyMiddleware(thunk));
    }
    init(...args) {
        const [token, options] = expectInitArg(args);

        const { symbol } = options;

        this.initArgs = args;

        this.options = options;

        this.startPromise = this.loginAndGetBalance(token);

        this.watchTicks(symbol);
    }
    start(tradeOptions) {
        if (!this.options) {
            throw createError('NotInitialized', translate('Bot.init is not called'));
        }

        this.tradeOptions = expectTradeOptions(tradeOptions);

        this.store.dispatch(start());

        this.checkLimits(tradeOptions);

        this.makeProposals({ ...this.options, ...tradeOptions });

        this.checkProposalReady();
    }
    loginAndGetBalance(token) {
        if (this.token === token) {
            return Promise.resolve();
        }

        doUntilDone(() => this.api.authorize(token)).catch(e => this.$scope.observer.emit('Error', e));

        return new Promise(resolve =>
            this.listen('authorize', () => {
                this.token = token;
                resolve();
            })
        ).then(() => this.subscribeToBalance());
    }
    observe() {
        this.observeOpenContract();

        this.observeBalance();

        this.observeProposals();
    }
    watch(watchName) {
        if (watchName === 'before') {
            return watchBefore(this.store);
        }
        return watchDuring(this.store);
    }
    getData() {
        return this.data;
    }
    listen(n, f) {
        this.api.events.on(n, f);
    }
}
