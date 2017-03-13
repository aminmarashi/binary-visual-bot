import { Map } from 'immutable'
import Proposal from './Proposal'
import Broadcast from './Broadcast'
import Total from './Total'
import Balance from './Balance'
import FollowTicks from './FollowTicks'
import OpenContract from './OpenContract'

const scopeToWatchResolve = {
  before: ['before', true],
  purchase: ['before', false],
  during: ['during', true],
  after: ['during', false],
}

export default class TradeEngine extends Balance(
  OpenContract(Proposal(FollowTicks(Broadcast(Total(class {})))))) {
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
  start(token, tradeOption) {
    this.makeProposals(tradeOption)

    this.followTicks(tradeOption.symbol)

    if (token === this.token) {
      return
    }

    this.api.authorize(token).then(() => {
      this.token = token
      this.subscribeToBalance()
    })
  }
  purchase(contractType) {
    const toBuy = this.selectProposal(contractType)

    this.isPurchaseStarted = true

    this.api.buyContract(toBuy.id, toBuy.ask_price).then(r => {
      this.broadcastPurchase(r.buy, contractType)
      this.subscribeToOpenContract(r.buy.contract_id)
      this.signal('purchase')
    })
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
  isInside(scope) {
    return this.scope === scope
  }
  listen(n, f) {
    this.api.events.on(n, f)
  }
}
