import Interpreter from 'js-interpreter'
import BotApi from './BotApi'

const createAsync = (interpreter, func) =>
  interpreter.createAsyncFunction((arg, cb) =>
    func(interpreter.pseudoToNative(arg))
      .then(rv => (rv ? cb(interpreter.nativeToPseudo(rv)) : cb())))

export default class JSI {
  constructor($scope) {
    if ($scope) {
      this.botApi = new BotApi($scope)
      this.observer = $scope.observer
    }
  }
  run(code) {
    let initFunc

    if (this.botApi) {
      const Bot = this.botApi.getInterface('Bot')

      const { isInside, wait, alert } = this.botApi.getInterface()

      initFunc = (interpreter, scope) => {
        interpreter.setProperty(scope, 'console',
          interpreter.nativeToPseudo({ log(...args) { console.log(...args) } })) // eslint-disable-line no-console
        interpreter.setProperty(scope, 'alert',
          interpreter.nativeToPseudo(alert))
        interpreter.setProperty(scope, 'Bot',
          interpreter.nativeToPseudo(Bot))
        interpreter.setProperty(scope, 'isInside',
          interpreter.nativeToPseudo(isInside))
        interpreter.setProperty(scope, 'wait',
          createAsync(interpreter, wait))
      }
    }

    return new Promise(r => {
      const interpreter = new Interpreter(code, initFunc)

      const loop = () => {
        if (!interpreter.run()) {
          if (this.observer) {
            this.observer.unregisterAll('CONTINUE')
          }
          r(interpreter.value)
          return
        }
        if (!this.observer.isRegistered('CONTINUE')) {
          this.observer.register('CONTINUE', loop)
        }
      }

      loop()
    })
  }
}
