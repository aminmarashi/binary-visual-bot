// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#2jo335
import config from '../../../../../common/const'
import { translate } from '../../../../../../common/i18n'

Blockly.Blocks.ohlc_values_in_list = {
  init: function init() {
    this.appendValueInput('OHLCLIST')
      .appendField(translate('Candle Values'))
      .appendField(new Blockly.FieldDropdown(config.ohlcFields), 'OHLCFIELD_LIST')
    this.setOutput(true, 'Array')
    this.setColour('#dedede')
    this.setTooltip(translate('Returns a list of the selected candle values'))
    this.setHelpUrl('https://github.com/binary-com/binary-bot/wiki')
  },
}

Blockly.JavaScript.ohlc_values_in_list = block => {
  const ohlcList = Blockly.JavaScript.valueToCode(block,
    'OHLCLIST', Blockly.JavaScript.ORDER_ATOMIC)
  const ohlcField = block.getFieldValue('OHLCFIELD_LIST')
  return [`Bot.candleValues(${ohlcList}, '${ohlcField}')`, Blockly.JavaScript.ORDER_ATOMIC]
}
