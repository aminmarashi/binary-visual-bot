import TradeEngine from '../TradeEngine'
import { noop, subtractFixed, createDetails } from '../tools'
import { sanitizeStart } from '../sanitize'
import TicksInterface from './TicksInterface'
import ToolsInterface from './ToolsInterface'

/**
 * Bot - Bot Module
 * @namespace Bot
 */

export default class Interface extends ToolsInterface(TicksInterface(class {})) {
  constructor($scope) {
    super()
    this.tradeEngine = new TradeEngine($scope)
    this.api = $scope.api
    this.observer = $scope.observer
    this.$scope = $scope
  }
  getInterface(name = 'Global') {
    return name === 'Bot' ? {
      ...this.getBotInterface(),
      ...this.getToolsInterface(),
    } : {
      watch: (...args) => this.tradeEngine.watch(...args),
      isInside: (...args) => this.tradeEngine.isInside(...args),
      sleep: (...args) => this.sleep(...args),
      alert: (...args) => alert(...args), // eslint-disable-line no-alert
    }
  }
  getBotInterface() {
    const getDetail = i => createDetails(this.get('contract'))[i]

    return {
      start: (...args) => this.tradeEngine.start(...sanitizeStart(args)),
      stop: (...args) => this.tradeEngine.stop(...args),
      purchase: contractType => this.tradeEngine.purchase(contractType),
      getAskPrice: contractType => +this.getProposal(contractType).ask_price,
      getPayout: contractType => +this.getProposal(contractType).payout,
      isSellAvailable: () => this.tradeEngine.isSellAtMarketAvailable(),
      sellAtMarket: () => this.tradeEngine.sellAtMarket(),
      getSellPrice: () => this.getSellPrice(),
      isResult: result => (getDetail(10) === result),
      readDetails: i => getDetail(i - 1),
    }
  }
  sleep(arg = 1) {
    return new Promise(r => setTimeout(() => {
      r()
      setTimeout(() => this.observer.emit('CONTINUE'), 0)
    }, arg * 1000), noop)
  }
  getProposal(contractType) {
    const proposals = this.get('proposals')

    let proposal

    proposals.forEach(p => {
      if (p.contractType === contractType) {
        proposal = p
      }
    })

    return proposal
  }
  getSellPrice() {
    const { bid_price: bidPrice, buy_price: buyPrice } = this.get('contract')

    return subtractFixed(bidPrice, buyPrice)
  }
  get(key) {
    return this.tradeEngine.getData().get(key)
  }
}
