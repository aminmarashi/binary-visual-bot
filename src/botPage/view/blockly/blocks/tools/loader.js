// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#tkcvmb
import { observer } from 'binary-common-utils/lib/observer'
import { translator } from '../../../../../common/translator'
import { deleteBlocksLoadedBy, loadRemote, recoverDeletedBlock } from '../../utils'


Blockly.Blocks.loader = {
  init: function init() {
    this.appendDummyInput()
      .appendField(`${translator.translateText('Load Block From')}:`)
      .appendField(new Blockly.FieldTextInput('http://www.example.com/block.xml'), 'URL')
    this.setInputsInline(true)
    this.setColour('#dedede')
    this.setTooltip(translator.translateText('Load blocks from url'))
    this.setHelpUrl('https://github.com/binary-com/binary-bot/wiki')
    this.loadedByMe = []
    this.loadedVariables = []
  },
  onchange: function onchange(ev) {
    if (!this.isInFlyout
      && ev.type === 'change' && ev.element === 'disabled'
      && ev.blockId === this.id) {
      if (ev.newValue === true) {
        deleteBlocksLoadedBy(this.id)
      } else {
        const loader = Blockly.mainWorkspace.getBlockById(ev.blockId)
        if (loader && loader.loadedByMe) {
          for (const blockId of loader.loadedByMe) {
            recoverDeletedBlock(Blockly.mainWorkspace.getBlockById(blockId))
          }
        }
      }
    }
    if (!this.isInFlyout
      && (ev.type === 'change' && ev.element === 'field') && ev.blockId === this.id && !this.disabled) {
      const recordUndo = Blockly.Events.recordUndo
      Blockly.Events.recordUndo = false
      deleteBlocksLoadedBy(this.id)
      loadRemote(this).then(() => {
        Blockly.Events.recordUndo = recordUndo
        observer.emit('ui.log.success', translator.translateText('Blocks are loaded successfully'))
      }, (e) => {
        Blockly.Events.recordUndo = recordUndo
        observer.emit('ui.log.error', e)
      })
    }
  },
}

Blockly.JavaScript.loader = (block) => (block.loadedVariables.length ? `var ${
block.loadedVariables.map((v) => Blockly.JavaScript.variableDB_.safeName_(v)).toString()
};` : '')
