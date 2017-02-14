import { observer } from 'binary-common-utils/lib/observer'
import Trade from './Trade'

export default class PurchaseCtrl {
  constructor(api, CM) {
    this.api = api
    this.CM = CM
    this.ready = false
    this.purchased = false
    this.proposals = {}
    this.expectedNumOfProposals = 2
  }
  getContract(option) {
    return this.proposals[option]
  }
  isSellAvailable() {
    return this.trade && this.trade.isSellAvailable
  }
  sellAtMarket() {
    return this.trade &&
      this.trade.isSellAvailable && this.trade.sellAtMarket()
  }
  setNumOfProposals(num) {
    this.expectedNumOfProposals = num
  }
  updateProposal(proposal) {
    if (!this.purchased) {
      this.proposals[proposal.contract_type] = proposal
      if (!this.ready &&
        Object.keys(this.proposals).length === this.expectedNumOfProposals) {
        this.ready = true
      }
    }
  }
  updateTicks() {
    if (!this.purchased && this.ready) {
      observer.emit('log.purchase.start', { proposals: this.proposals })
      this.CM.execContext('before', this.proposals)
    }
  }
  purchase(option) {
    if (!this.purchased && this.ready) {
      this.purchased = true

      observer.register('trade.update', openContract => {
        this.CM.execContext('during', openContract)
        observer.emit('purchase.tradeUpdate', openContract)
      }, false, null, true)
      observer.register('trade.finish', finishedContract => {
        this.ready = false
        observer.emit('purchase.finish', finishedContract)
      }, true, null, true)

      this.trade = new Trade(this.api)
      this.trade.purchase(this.proposals[option])
    }
  }
}
