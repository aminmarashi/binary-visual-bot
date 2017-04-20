import { expectReturnTrue, parts } from './tools'


expectReturnTrue('Main Blocks', `
      (function (){
        ${parts.timeTrade}
        ${parts.waitToPurchase}
        ${parts.waitToSell}
        return true;
      })();
  `)

expectReturnTrue('Main Blocks - Multiple Trades', `
      (function (){
        var count = 10;
        while(true) {
          ${parts.timeTrade}
          ${parts.waitToPurchase}
          ${parts.waitToSell}
          sleep(1)
          if (--count === 0) {
            break;
          }
        }
        return count === 0;
      })();
  `)

expectReturnTrue('Main Blocks - Sell Expired', `
      (function (){
        ${parts.tickTrade}
        ${parts.waitToPurchase}
        while (watch('during')) {}
        return true;
      })();
  `)
