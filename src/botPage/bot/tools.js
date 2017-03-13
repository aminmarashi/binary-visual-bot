import { Map } from 'immutable'

export const noop = () => {}

export const tradeOptionToProposal = tradeOption =>
  tradeOption.contractTypes.map(type =>
    Object.assign({
      duration_unit: tradeOption.duration_unit,
      basis: tradeOption.basis,
      currency: tradeOption.currency,
      symbol: tradeOption.symbol,
      duration: tradeOption.duration,
      amount: tradeOption.amount.toFixed(2),
      contract_type: type,
    },
    'prediction' in tradeOption && {
      barrier: tradeOption.prediction,
    },
    'barrierOffset' in tradeOption && {
      barrier: tradeOption.barrierOffset,
    },
    'secondBarrierOffset' in tradeOption && {
      barrier2: tradeOption.secondBarrierOffset,
    }))

export const getDirection = ticks => {
  const length = ticks.length
  const [tick1, tick2] = ticks.slice(-2)

  let direction = ''
  if (length >= 2) {
    direction = tick1.quote > tick2.quote ? 'rise' : direction
    direction = tick1.quote < tick2.quote ? 'fall' : direction
  }

  return direction
}


export const getPipSizes = symbols =>
  symbols.reduce((s, i) =>
    s.set(i.symbol, +(+i.pip).toExponential().substring(3)), new Map()).toObject()

export const subscribeToStream = (observer, name, respHandler, request,
  registerOnce, type, unregister) =>
  new Promise((resolve) => {
    observer.register(
      name, (...args) => {
        respHandler(...args)
        resolve()
      }, registerOnce, type && { type, unregister }, true)
    request()
  })

export const registerStream = (observer, name, cb) => {
  if (observer.isRegistered(name)) {
    return
  }
  observer.register(name, cb)
}

export const doUntilDone = f => new Promise(resolve => {
  const repeat = () => {
    const promise = f()

    if (promise) {
      promise.catch(repeat).then(resolve, repeat)
    } else {
      resolve()
    }
  }
  repeat()
})
