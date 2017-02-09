import sma, {
  simpleMovingAverageArray as smaa,
} from 'binary-indicators/lib/simpleMovingAverage'
import ema, {
  exponentialMovingAverageArray as emaa,
} from 'binary-indicators/lib/exponentialMovingAverage'
import bb, {
  bollingerBandsArray as bba,
} from 'binary-indicators/lib/bollingerBands'
import rsi, {
  relativeStrengthIndexArray as rsia,
} from 'binary-indicators/lib/relativeStrengthIndex'
import macda from 'binary-indicators/lib/macd'

export default class Indicators {
  constructor($scope) {
    this.CM = $scope.CM
  }
  decorate(f, input, config, ...args) {
    const pipSize = this.CM.getLastContext().data.ticksObj.pipSize
    return f(input, Object.assign({ pipSize }, config), ...args)
  }
  getInterface() {
    return {
      sma: (input, periods) => this.decorate(sma, input, { periods }),
      smaa: (input, periods) => this.decorate(smaa, input, { periods }),
      ema: (input, periods) => this.decorate(ema, input, { periods }),
      emaa: (input, periods) => this.decorate(emaa, input, { periods }),
      rsi: (input, periods) => this.decorate(rsi, input, { periods }),
      rsia: (input, periods) => this.decorate(rsia, input, { periods }),
      bb: (input, config, field) => this.decorate(bb, input, config)[field],
      bba: (input, config, field) =>
        this.decorate(bba, input, config).map(r => r[field]),
      macda: (input, config, field) =>
        this.decorate(macda, input, config).map(r => r[field]),
    }
  }
}
