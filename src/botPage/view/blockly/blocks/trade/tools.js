import { marketDropdown, tradeTypeDropdown, candleInterval, contractTypes, restart } from './components';
import { findTopParentBlock } from '../../utils';
import config from '../../../../common/const';
import { translate } from '../../../../../common/i18n';
import { observer as globalObserver } from '../../../../../common/utils/observer';

export const getTradeType = block => {
    const tradeDefBlock = findTopParentBlock(block);
    return tradeDefBlock && tradeDefBlock.getFieldValue('TRADETYPE_LIST');
};

export const getSelectedSymbol = block => {
    const tradeDefBlock = findTopParentBlock(block);
    return tradeDefBlock && tradeDefBlock.getFieldValue('SYMBOL_LIST');
};

export const updateInputList = block => {
    const tradeType = getTradeType(block);
    if (tradeType) {
        Blockly.Blocks[tradeType].init.call(block);
    }
};

export const setInputList = block => {
    Blockly.Blocks.allFields.init.call(block);
};

const marketFields = [
    'MARKET_LIST',
    'SUBMARKET_LIST',
    'SYMBOL_LIST',
    'TRADETYPECAT_LIST',
    'TRADETYPE_LIST',
    'TYPE_LIST',
    'CANDLEINTERVAL_LIST',
];

const tradeOptionFields = [
    'DURATIONTYPE_LIST',
    'CURRENCY_LIST',
    'BARRIEROFFSETTYPE_LIST',
    'SECONDBARRIEROFFSETTYPE_LIST',
];

const extendField = (parent, block, field) => {
    const value = block.getFieldValue(field);
    if (value) {
        parent.setFieldValue(value, field);
    }
};

export const extendParentFields = (parent, block, fields) => {
    fields.forEach(field => extendField(parent, block, field));
};

export const ignoreAndGroupEvents = f => {
    const { recordUndo } = Blockly.Events;
    Blockly.Events.recordUndo = false;
    Blockly.Events.setGroup('BackwardCompatibility');
    f();
    Blockly.Events.setGroup(false);
    Blockly.Events.recordUndo = recordUndo;
};

export const cloneTradeOptions = (clone, block) => {
    extendParentFields(clone, block, tradeOptionFields);
    block.inputList.forEach(input => {
        if (input.connection && input.connection.targetConnection) {
            clone.getInput(input.name).connection.connect(input.connection.targetConnection);
        }
    });
};

export const createTradeOptions = () => {
    const tradeOptions = Blockly.mainWorkspace.newBlock('tradeOptions');

    tradeOptions.initSvg();
    tradeOptions.render();

    return tradeOptions;
};

const fixStatements = (block, tradeOptions) => {
    const trade = findTopParentBlock(block);
    const parent = block.getParent();
    const parentIsTradeDef = !parent.nextConnection;

    if (parentIsTradeDef) {
        trade.getInput('SUBMARKET').connection.connect(tradeOptions.previousConnection);
    } else {
        trade.getInput('INITIALIZATION').connection.connect(trade.getInput('SUBMARKET').connection.targetConnection);
        trade.getInput('SUBMARKET').connection.connect(tradeOptions.previousConnection);
    }
};

const addMarketToTrade = (trade, condition) => {
    const tradeTypeList = trade.getField('TRADETYPE_LIST');
    if (tradeTypeList) {
        tradeTypeList.setValue(condition.type);
    }
};

export const marketToTradeOption = (market, marketOptions) => {
    ignoreAndGroupEvents(() => {
        const trade = findTopParentBlock(market);

        if (!trade || trade.type !== 'trade') {
            market.dispose();
            return;
        }

        const tradeOptions = createTradeOptions();

        fixStatements(market, tradeOptions);

        if (marketOptions) {
            const [condition] = market.getChildren();

            if (condition) {
                cloneTradeOptions(tradeOptions, condition);
                addMarketToTrade(trade, condition);
            }
        } else {
            cloneTradeOptions(tradeOptions, market);
        }

        if (marketOptions) {
            trade.setFieldValue(marketOptions.market, 'MARKET_LIST');
            trade.setFieldValue(marketOptions.submarket, 'SUBMARKET_LIST');
            trade.setFieldValue(marketOptions.symbol, 'SYMBOL_LIST');
            globalObserver.emit('bot.init', marketOptions.symbol);
        } else {
            const symbol = market.getFieldValue('SYMBOL_LIST');
            if (symbol) {
                globalObserver.emit('bot.init', symbol);
            }
            extendParentFields(trade, market, marketFields);
        }

        updateInputList(tradeOptions);

        market.dispose();
    });
};

export const marketDefPlaceHolders = block => {
    marketDropdown(block);
    tradeTypeDropdown(block);
    contractTypes(block);
    candleInterval(block);
    restart(block);
};

export const getDurationOptions = (symbol, selectedContractType) => {
    const defaultDurations = [
        [translate('Ticks'), 't'],
        [translate('Seconds'), 's'],
        [translate('Minutes'), 'm'],
        [translate('Hours'), 'h'],
        [translate('Days'), 'd'],
    ];

    // Resolve contract types like risefallequals to callput
    const actualContractType = Object.keys(config.conditionsCategory).find(
        category =>
            category === selectedContractType || config.conditionsCategory[category].includes(selectedContractType)
    );

    const assetIndex = JSON.parse(sessionStorage.getItem('assetIndex')) || [];
    if (assetIndex) {
        const asset = assetIndex.find(asset => asset[0] === symbol);
        if (asset) {
            const contractType = asset[2].find(contractType => contractType[0] === actualContractType);
            if (contractType) {
                const startIndex = defaultDurations.findIndex(d => d[1] === contractType[2].replace(/\d+/g, ''));
                const endIndex = defaultDurations.findIndex(d => d[1] === contractType[3].replace(/\d+/g, ''));
                const availableDurations = defaultDurations.slice(startIndex, endIndex + 1).filter(
                    (
                        duration // Apply custom rules e.g. remove day-durations from each contract type
                    ) => !config.durationRules.remove[actualContractType].includes(duration[1])
                );
                if (availableDurations.length) {
                    return availableDurations;
                }
                return [[translate('No available durations'), 'na']];
            }
        }
    }

    // Fallback to old hardcoded durations
    return config.durationTypes[selectedContractType.toUpperCase()];
};
