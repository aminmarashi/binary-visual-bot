import { observer as globalObserver } from 'binary-common-utils/lib/observer'
import { expect } from 'chai'
import { runAndGetResult } from '../../tools'


describe('Misc. tools', () => {
  let result
  const observed = {}

  globalObserver.register('Notify', notify => (observed.notify = notify))

  beforeAll(done => {
    runAndGetResult(undefined, `
        Bot.notify('Test', 'info')
        result.totalRuns = Bot.getTotalRuns();
        result.totalProfit = Bot.getTotalProfit();
        watch('before')
        result.balance = Bot.getBalance('NUM')
        result.balanceStr = Bot.getBalance('STR')
    `).then(v => {
      result = v
      done()
    })
  })
  it('Balance', () => {
    const { balance, balanceStr } = result

    expect(balance).to.be.a('Number')
    expect(balanceStr).to.be.a('String')
    expect(parseFloat(balanceStr)).equal(balance)
  })

  it('Total Profit', () => {
    const { totalProfit } = result

    expect(totalProfit).to.be.a('Number')
  })

  it('Total runs', () => {
    const { totalRuns } = result

    expect(totalRuns).equal(0)
  })

  it('Notify', () => {
    const { notify } = observed

    expect(notify).deep.equal(['Test', 'info'])
  })
})
