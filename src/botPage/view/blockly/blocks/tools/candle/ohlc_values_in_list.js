// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#2jo335
import config from '../../../../../../common/const'
import { translate } from '../../../../../../common/i18n'

Blockly.Blocks.ohlc_values_in_list = {
  init: function init() {
    this.appendValueInput('OHLCLIST')
      .appendField(translate('Make a list of'))
      .appendField(new Blockly.FieldDropdown(config.ohlcFields), 'OHLCFIELD_LIST')
      .appendField(translate('values from candles list'))
    this.setOutput(true, 'Array')
    this.setColour('#dedede')
    this.setTooltip(translate('Returns a list of the selected candle values'))
    this.setHelpUrl('https://github.com/binary-com/binary-bot/wiki')
  },
}

Blockly.JavaScript.ohlc_values_in_list = (block) => {
  const ohlcList = Blockly.JavaScript.valueToCode(block,
    'OHLCLIST', Blockly.JavaScript.ORDER_ATOMIC)
  const ohlcField = block.getFieldValue('OHLCFIELD_LIST')
  const code = `(Bot.expect.notEmptyArray(${ohlcList}).map(function(e){return Bot.expect.ohlc(e).${
  ohlcField}}))`
  return [code, Blockly.JavaScript.ORDER_ATOMIC]
}
