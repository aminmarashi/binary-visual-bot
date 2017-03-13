import { tradeOptionToProposal } from '../tools'

export default Engine => class Proposal extends Engine {
  constructor() {
    super()
    this.expectedProposalCount = 0
  }
  makeProposals(tradeOption) {
    if (!this.isNewTradeOption(tradeOption)) {
      return
    }
    this.proposalTemplates = tradeOptionToProposal(tradeOption)
    this.unsubscribeProposals()
    this.requestProposals()
  }
  selectProposal(contractType) {
    let toBuy
    let toForget

    this.data.get('proposals').forEach(proposal => {
      if (proposal.contractType === contractType) {
        toBuy = proposal
      } else {
        toForget = proposal
      }
    })

    this.api.unsubscribeByID(toForget.id).then(() => this.requestProposals())

    return toBuy
  }
  requestProposals() {
    this.data = this.data.set('proposals', new Map())

    this.proposalTemplates.forEach(proposal => {
      this.api.subscribeToPriceForContractProposal(proposal).then(r => {
        this.data = this.data.setIn(['proposals', r.proposal.id],
          Object.assign({ contractType: proposal.contract_type }, r.proposal))
        this.setReady()
      })
    })
  }
  observeProposals() {
    this.listen('proposal', r => {
      const proposal = r.proposal
      const id = proposal.id

      if (this.data.hasIn(['proposals', id])) {
        this.data.setIn(['proposals', id], proposal)
        this.setReady()
      }
    })
  }
  unsubscribeProposals() {
    if (!this.data.has('proposals')) {
      return
    }
    this.data.get('proposals').forEach(proposal =>
      this.api.unsubscribeByID(proposal.id))
  }
  setReady() {
    this.expectedProposalCount = (this.expectedProposalCount + 1) % 2
  }
  checkReady() {
    return this.data.get('proposals').size && !this.expectedProposalCount
  }
  isNewTradeOption(tradeOption) {
    if (!this.tradeOption) {
      this.tradeOption = tradeOption
      return true
    }

    const isNotEqual = key => this.tradeOption[key] !== tradeOption[key]

    return (isNotEqual('duration') || isNotEqual('amount') ||
      isNotEqual('prediction') || isNotEqual('barrierOffset') ||
      isNotEqual('secondBarrierOffset'))
  }
}
