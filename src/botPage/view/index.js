/* eslint-disable import/no-extraneous-dependencies */
import 'babel-polyfill'
import lzString from 'lz-string'
import $ from 'jquery'
import View from './View'
import { setAppId } from '../common/appId'
import { load as loadLang } from '../common/lang'

loadLang()
window.$ = $

require('notifyjs-browser')
require('./draggable')

setAppId()
$.ajaxSetup({
  cache: false,
})

window._trackJs = { // eslint-disable-line no-underscore-dangle
  token: '346262e7ffef497d85874322fff3bbf8',
  application: 'binary-bot',
  enabled: window.location.hostname !== 'localhost',
  console: {
    display: false,
  },
}

require('trackjs')

const view = new View().initPromise.then(() => {
  $('.show-on-load').show()
  $('.barspinner').hide()
  trackJs.configure({
    userId: $('.account-id').first().text(),
    onError: (payload, error) => {
      if (error && error.message && error.message.indexOf('The play() request was'
        + ' interrupted by a call to pause()') >= 0) {
          return false
        }
      payload.console.push({
        message: lzString.compressToBase64(view.blockly.generatedJs),
        severity: 'log',
        timestamp: new Date().toISOString(),
      })
      payload.console.push({
        message: lzString.compressToBase64(view.blockly.blocksXmlStr),
        severity: 'log',
        timestamp: new Date().toISOString(),
      })
      payload.console.push({
        message: lzString.compressToBase64(
          Blockly.Xml.domToPrettyText(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace))),
        severity: 'log',
        timestamp: new Date().toISOString(),
      })
      return true
    },
  })
})

