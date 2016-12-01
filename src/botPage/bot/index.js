import { observer } from 'binary-common-utils/lib/observer'
import CustomApi from 'binary-common-utils/lib/customApi'
import { getToken } from 'binary-common-utils/lib/storageManager'
import _ from 'underscore'
import PurchaseCtrl from './purchaseCtrl'
import _Symbol from './symbol'
import { number as expectNumber, barrierOffset as expectBarrierOffset } from '../../common/expect'

const decorateTradeOptions = (tradeOption, otherOptions = {}) => {
  const option = {
    duration_unit: tradeOption.duration_unit,
    basis: tradeOption.basis,
    currency: tradeOption.currency,
    symbol: tradeOption.symbol,
    ...otherOptions,
  }
  option.duration = expectNumber('duration', tradeOption.duration)
  option.amount = expectNumber('amount', tradeOption.amount).toFixed(2)
  if ('prediction' in tradeOption) {
    option.barrier = expectNumber('prediction', tradeOption.prediction)
  }
  if ('barrierOffset' in tradeOption) {
    option.barrier = expectBarrierOffset(tradeOption.barrierOffset)
  }
  if ('secondBarrierOffset' in tradeOption) {
    option.barrier2 = expectBarrierOffset(tradeOption.secondBarrierOffset)
  }
  return option
}

export default class Bot {
  constructor(api = null) {
    this.ticks = []
    this.candles = []
    this.currentCandleInterval = 0
    this.currentToken = ''
    this.balanceStr = ''
    this.currentSymbol = ''
    this.unregisterOnFinish = []
    this.totalProfit = 0
    this.totalRuns = 0
    this.totalWins = 0
    this.totalLosses = 0
    this.totalStake = 0
    this.totalPayout = 0
    this.balance = 0
    this.api = (api === null) ? new CustomApi() : api
    this.symbol = new _Symbol(this.api)
    this.initPromise = this.symbol.initPromise
    this.shouldRestartOnError = () => this.tradeOption && this.tradeOption.restartOnError
    this.restartOnError = () => {
      if (this.shouldRestartOnError()) {
        this.start(...this.startArgs)
      }
    }
  }
  start(...args) {
    const [token, tradeOption, beforePurchase, duringPurchase,
      afterPurchase, sameTrade, tickAnalysisList = []] = args
    this.startArgs = args
    if (!this.purchaseCtrl || sameTrade) {
      if (this.purchaseCtrl) {
        this.purchaseCtrl.destroy()
      }
      this.purchaseCtrl = new PurchaseCtrl(this.api, beforePurchase, duringPurchase, afterPurchase)
      this.tickAnalysisList = tickAnalysisList
      this.tradeOption = tradeOption
      observer.emit('log.bot.start', {
        again: !!sameTrade,
      })
      const accountName = getToken(token).account_name
      if (typeof amplitude !== 'undefined') {
        amplitude.getInstance().setUserId(accountName)
      }
      if (typeof trackJs !== 'undefined') {
        trackJs.configure({
          userId: accountName,
        })
      }
      if (sameTrade) {
        this.startTrading()
      } else {
        const promises = []
        if (this.currentToken !== token) {
          promises.push(this.login(token))
        }
        if (!_.isEmpty(this.tradeOption)) {
          if (this.tradeOption.symbol !== this.currentSymbol) {
            observer.unregisterAll('api.ohlc')
            observer.unregisterAll('api.tick')
            promises.push(this.subscribeToTickHistory())
            promises.push(this.subscribeToCandles())
          } else if (this.tradeOption.candleInterval !== this.currentCandleInterval) {
            observer.unregisterAll('api.ohlc')
            promises.push(this.subscribeToCandles())
          }
        }
        Promise.all(promises).then(() => {
          this.startTrading()
        }).catch((error) => {
          if (error.name === 'BlocklyError') {
            // pass
          } else {
            throw error
          }
        })
      }
    }
  }
  login(token) {
    return new Promise((resolve) => {
      const apiAuthorize = () => {
        observer.emit('log.bot.login', {
          lastToken: this.currentToken,
          token,
        })
        this.currentToken = token
        this.subscribeToBalance()
        this.observeStreams()
        resolve()
      }
      observer.register('api.authorize', apiAuthorize, true, {
        type: 'authorize',
        unregister: [['api.authorize', apiAuthorize]],
      }, true)
      this.api.authorize(token)
    })
  }
  setTradeOptions() {
    this.tradeOptions = []
    if (!_.isEmpty(this.tradeOption)) {
      this.pip = this.symbol.activeSymbols.getSymbols()[this.tradeOption.symbol.toLowerCase()].pip
      for (const type of JSON.parse(this.tradeOption.contractTypes)) {
        this.tradeOptions.push(decorateTradeOptions(this.tradeOption, {
          contract_type: type,
        }))
      }
    }
  }
  subscribeToBalance() {
    const apiBalance = (balance) => {
      this.balance = balance.balance
      this.balanceStr = `${Number(balance.balance).toFixed(2)} ${balance.currency}`
      observer.emit('bot.tradeInfo', {
        balance: this.balanceStr,
      })
    }
    observer.register('api.balance', apiBalance, false, {
      type: 'balance',
      unregister: [['api.balance', apiBalance]],
    })
    this.api.balance()
  }
  subscribeToCandles() {
    return new Promise((resolve) => {
      const apiCandles = (candles) => {
        this.observeOhlc()
        this.currentCandleInterval = this.tradeOption.candleInterval
        this.candles = candles
        resolve()
      }
      observer.register('api.candles', apiCandles, true, {
        type: 'candles',
        unregister: ['api.ohlc', 'api.candles', 'api.tick', 'bot.tickUpdate'],
      })
      this.api.originalApi.unsubscribeFromAllCandles().then(() => 0, () => 0)
      this.api.history(this.tradeOption.symbol, {
        end: 'latest',
        count: 5000,
        granularity: this.tradeOption.candleInterval,
        style: 'candles',
        subscribe: 1,
      })
    })
  }
  subscribeToTickHistory() {
    return new Promise((resolve) => {
      const apiHistory = (history) => {
        this.observeTicks()
        this.currentSymbol = this.tradeOption.symbol
        this.ticks = history
        resolve()
      }
      observer.register('api.history', apiHistory, true, {
        type: 'history',
        unregister: [['api.history', apiHistory], 'api.tick',
          'bot.tickUpdate', 'api.ohlc', 'api.candles'],
      }, true)
      this.api.originalApi.unsubscribeFromAllTicks().then(() => 0, () => 0)
      this.api.history(this.tradeOption.symbol, {
        end: 'latest',
        count: 5000,
        subscribe: 1,
      })
    })
  }
  observeTicks() {
    if (!observer.isRegistered('api.tick')) {
      const apiTick = (tick) => {
        this.ticks = [...this.ticks, tick]
        this.ticks.splice(0, 1)
        let direction = ''
        const length = this.ticks.length
        const tick1 = this.ticks.slice(-1)[0]
        const tick2 = this.ticks.slice(-2)[0]
        if (length >= 2) {
          if (tick1.quote > tick2.quote) {
            direction = 'rise'
          }
          if (tick1.quote < tick2.quote) {
            direction = 'fall'
          }
        }
        const ticks = {
          direction,
          ticks: this.ticks,
          ohlc: this.candles,
        }
        for (const tickAnalysis of this.tickAnalysisList) {
          tickAnalysis.call({
            ticks,
          })
        }
        if (this.purchaseCtrl) {
          this.purchaseCtrl.updateTicks(ticks)
        }
        observer.emit('bot.tickUpdate', {
          ...ticks,
          pip: this.pip,
        })
      }
      observer.register('api.tick', apiTick)
    }
  }
  observeOhlc() {
    if (!observer.isRegistered('api.ohlc')) {
      const apiOHLC = (candle) => {
        if (this.candles.length && this.candles.slice(-1)[0].epoch === candle.epoch) {
          this.candles = [...this.candles.slice(0, -1), candle]
        } else {
          this.candles = [...this.candles, candle]
          this.candles.splice(0, 1)
        }
      }
      observer.register('api.ohlc', apiOHLC)
    }
  }
  observeTradeUpdate() {
    if (!observer.isRegistered('purchase.tradeUpdate')) {
      const beforePurchaseTradeUpdate = (contract) => {
        if (this.purchaseCtrl) {
          observer.emit('bot.tradeUpdate', contract)
        }
      }
      observer.register('purchase.tradeUpdate', beforePurchaseTradeUpdate)
    }
  }
  observeStreams() {
    this.observeTradeUpdate()
    this.observeTicks()
    this.observeOhlc()
  }
  subscribeProposals() {
    this.setTradeOptions()
    observer.unregisterAll('api.proposal')
    if (this.purchaseCtrl) {
      this.purchaseCtrl.setNumOfProposals(this.tradeOptions.length)
    }
    const apiProposal = (proposal) => {
      if (this.purchaseCtrl) {
        observer.emit('log.bot.proposal', proposal)
        this.purchaseCtrl.updateProposal(proposal)
      }
    }
    observer.register('api.proposal', apiProposal, false)
    this.unregisterOnFinish.push(['api.proposal', apiProposal])
    this.api.originalApi.unsubscribeFromAllProposals().then(() => {
      for (const tradeOption of this.tradeOptions) {
        this.api.proposal(tradeOption)
      }
    }, () => 0)
  }
  waitForBeforePurchaseFinish() {
    const beforePurchaseFinish = (contract) => {
      this.botFinish(contract)
    }
    observer.register('purchase.finish', beforePurchaseFinish, true, null, true)
    this.unregisterOnFinish.push(['purchase.finish', beforePurchaseFinish])
  }
  waitForTradePurchase() {
    const tradePurchase = (info) => {
      this.totalRuns += 1
      observer.emit('bot.tradeInfo', {
        totalRuns: this.totalRuns,
        transaction_ids: {
          buy: info.purchasedContract.transaction_id,
        },
        contract_type: info.contract.contract_type,
        buy_price: info.purchasedContract.buy_price,
      })
    }
    observer.register('trade.purchase', tradePurchase, true, null, true)
    this.unregisterOnFinish.push(['trade.purchase', tradePurchase])
  }
  startTrading() {
    this.waitForBeforePurchaseFinish()
    this.waitForTradePurchase()
    this.subscribeProposals()
  }
  updateTotals(contract) {
    const profit = +(Number(contract.sell_price) - Number(contract.buy_price)).toFixed(2)
    const user = getToken(this.currentToken)
    observer.emit('log.revenue', {
      user,
      profit,
      contract,
    })

    if (+profit > 0) {
      this.totalWins += 1
    } else if (+profit < 0) {
      this.totalLosses += 1
    }
    this.totalProfit = +(this.totalProfit + profit).toFixed(2)
    this.totalStake = +(this.totalStake + Number(contract.buy_price)).toFixed(2)
    this.totalPayout = +(this.totalPayout + Number(contract.sell_price)).toFixed(2)

    observer.emit('bot.tradeInfo', {
      totalProfit: this.totalProfit,
      totalWins: this.totalWins,
      totalLosses: this.totalLosses,
      totalStake: this.totalStake,
      totalPayout: this.totalPayout,
    })
  }
  botFinish(contract) {
    for (const obs of this.unregisterOnFinish) {
      observer.unregisterAll(...obs)
    }
    this.unregisterOnFinish = []
    this.updateTotals(contract)
    observer.emit('bot.finish', contract)
    // order matters
    this.purchaseCtrl.destroy()
    this.purchaseCtrl = null
  //
  }
  stop(contract) {
    if (!this.purchaseCtrl) {
      observer.emit('bot.stop', contract)
      return
    }
    for (const obs of this.unregisterOnFinish) {
      observer.unregisterAll(...obs)
    }
    this.unregisterOnFinish = []
    // order matters
    if (this.purchaseCtrl) {
      this.purchaseCtrl.destroy()
      this.purchaseCtrl = null
    }
    //
    this.api.originalApi.unsubscribeFromAllProposals().then(() => 0, () => 0)
    if (contract) {
      observer.emit('log.bot.stop', contract)
    }
    observer.emit('bot.stop', contract)
  }
}

export const bot = process.browser ? new Bot() : null
