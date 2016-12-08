// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#u7tjez
import { translator } from '../../../../../common/translator'
import './purchase'
import './ask_price'
import './payout'
import { configMainBlock, setBlockTextColor } from '../../utils'
import { purchase } from '../images'

Blockly.Blocks.before_purchase = {
  init: function init() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage(purchase, 15, 15, 'P'))
      .appendField(translator.translateText('(2) Watch and purchase your contract'))
    this.appendStatementInput('BEFOREPURCHASE_STACK')
      .setCheck('Purchase')
    this.setColour('#2a3052')
    this.setTooltip(translator.translateText('Watch the tick stream and purchase the desired contract (Runs on tick update)'))
    this.setHelpUrl('https://github.com/binary-com/binary-bot/wiki')
  },
  onchange: function onchange(ev) {
    if (ev.type === 'create') {
      setBlockTextColor(this)
    }
    configMainBlock(ev, 'before_purchase')
  },
}
Blockly.JavaScript.before_purchase = (block) => {
  const stack = Blockly.JavaScript.statementToCode(block, 'BEFOREPURCHASE_STACK')
  const code = `before_purchase = function before_purchase(){
    try {
      ${stack}
    } catch (e) {
      if (e.name !== 'BlocklyError') {
        Bot.notifyError(e);
        throw e;
      }
    }
  };
  `
  return code
}
