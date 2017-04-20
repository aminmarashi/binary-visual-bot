import { Map } from 'immutable'
import { observer as globalObserver } from 'binary-common-utils/lib/observer'
import { doUntilDone } from '../tools'
import { expectStartArg } from '../sanitize'
import Proposal from './Proposal'
import Broadcast from './Broadcast'
import Total from './Total'
import Balance from './Balance'
import PrepareBeforePurchase from './PrepareBeforePurchase'
import OpenContract from './OpenContract'
import Sell from './Sell'
import Purchase from './Purchase'

const scopeToWatchResolve = {
  before: ['before', true],
  purchase: ['before', false],
  during: ['during', true],
  after: ['during', false],
}

export default class TradeEngine extends Balance(Purchase(Sell(
  OpenContract(Proposal(PrepareBeforePurchase(Broadcast(Total(class {})))))))) {
  constructor($scope) {
    super()
    this.api = $scope.api
    this.observer = $scope.observer
    this.$scope = $scope
    this.observe()
    this.data = new Map()
    this.watches = new Map()
    this.signals = new Map()
  }
  start(...args) {
    const [token, tradeOption] = expectStartArg(args)
    this.watches = new Map()
    this.signals = new Map()

    const { symbol } = tradeOption

    this.checkLimits(tradeOption)

    globalObserver.emit('bot.start', symbol)

    this.makeProposals(tradeOption)

    this.startPromise = this.loginAndGetBalance(token)

    this.waitBeforePurchase(symbol)
  }
  loginAndGetBalance(token) {
    if (this.token === token) {
      return Promise.resolve()
    }

    doUntilDone(() => this.api.authorize(token)).catch(e => this.broadcastError(e))

    return new Promise(resolve =>
      this.listen('authorize', () => {
        this.token = token
        resolve()
      })).then(() => this.subscribeToBalance())
  }
  observe() {
    this.observeOpenContract()

    this.observeBalance()

    this.observeProposals()
  }
  signal(scope) {
    const [watchName, arg] = scopeToWatchResolve[scope]

    if (this.watches.has(watchName)) {
      const watch = this.watches.get(watchName)

      this.watches = this.watches.delete(watchName)

      watch(arg)
    } else {
      this.signals = this.signals.set(watchName, arg)
    }

    this.scope = scope
  }
  watch(watchName) {
    if (this.signals.has(watchName)) {
      const signal = this.signals.get(watchName)

      this.signals = this.signals.delete(watchName)
      return Promise.resolve(signal)
    }

    return new Promise(resolve => {
      this.watches = this.watches.set(watchName, resolve)
    })
  }
  getData() {
    return this.data
  }
  listen(n, f) {
    this.api.events.on(n, f)
  }
}
