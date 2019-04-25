import json2csv from 'json2csv';
import React, { Component } from 'react';
import ReactDataGrid from 'react-data-grid';
import { observer as globalObserver } from '../../../common/utils/observer';
import { appendRow, updateRow, saveAs } from '../shared';
import { translate } from '../../../common/i18n';
import { roundBalance } from '../../common/tools';
import * as style from '../style';

const isNumber = num => num !== '' && Number.isFinite(Number(num));

const getProfit = ({ sell_price: sellPrice, buy_price: buyPrice, currency }) => {
    if (isNumber(sellPrice) && isNumber(buyPrice)) {
        return roundBalance({
            currency,
            balance: Number(sellPrice) - Number(buyPrice),
        });
    }
    return '';
};

const getTimestamp = date => {
    const buyDate = new Date(date * 1000);
    return `${buyDate.toISOString().split('T')[0]} ${buyDate.toTimeString().slice(0, 8)} ${
        buyDate.toTimeString().split(' ')[1]
    }`;
};

const minHeight = 290;
const rowHeight = 25;

const ProfitColor = ({ value }) => <div style={value > 0 ? style.green : style.red}>{value}</div>;

export default class TradeTable extends Component {
    constructor({ accountID }) {
        super();
        this.state = {
            initial: {
                id  : 0,
                rows: [],
            },
            [accountID]: {
                id  : 0,
                rows: [],
            },
        };
        this.columns = [
            { key: 'timestamp', width: 192, resizable: true, name: translate('Timestamp') },
            { key: 'reference', width: 142, resizable: true, name: translate('Reference') },
            { key: 'contract_type', width: 104, resizable: true, name: translate('Trade type') },
            { key: 'entry_tick', width: 80, resizable: true, name: translate('Entry spot') },
            { key: 'exit_tick', width: 70, resizable: true, name: translate('Exit spot') },
            { key: 'buy_price', width: 80, resizable: true, name: translate('Buy price') },
            { key: 'profit', width: 80, resizable: true, name: translate('Profit/Loss'), formatter: ProfitColor },
        ];
    }
    componentWillMount() {
        globalObserver.register('summary.export', () => {
            const accountData = this.state[this.props.accountID];
            if (accountData && accountData.rows.length > 0) {
                this.export();
            }
        });
        globalObserver.register('summary.clear', () => {
            this.setState({ [this.props.accountID]: { ...this.state.initial } });
            globalObserver.emit('summary.disable_clear');
        });
        globalObserver.register('bot.stop', () => {
            const accountData = this.state[this.props.accountID];
            if (accountData && accountData.rows.length > 0) {
                globalObserver.emit('summary.enable_clear');
            }
        });
        globalObserver.register('summary.refresh', () => {
            const { accountID, api } = this.props;
            const { rows } = this.state[accountID];

            rows.forEach(row => {
                const contractID = row.contract_id;
                api.getContractInfo(contractID).then(r => {
                    const contract = r.proposal_open_contract;
                    this.updateTable({ accountID: this.props.accountID, ...contract });
                });
            });
        });
        globalObserver.register('bot.contract', info => {
            if (!info) {
                return;
            }
            const timestamp = getTimestamp(info.date_start);
            const tradeObj = { reference: info.transaction_ids.buy, ...info, timestamp };
            const { accountID } = tradeObj;

            const trade = {
                ...tradeObj,
                profit: getProfit(tradeObj),
            };

            const accountStat = this.getAccountStat(accountID);

            const { rows } = accountStat;
            const prevRowIndex = rows.findIndex(t => t.reference === trade.reference);

            if (trade.is_expired && trade.is_sold && !trade.exit_tick) trade.exit_tick = '-';

            if (prevRowIndex >= 0) {
                this.setState({ [accountID]: updateRow(prevRowIndex, trade, accountStat) });
            } else {
                this.setState({ [accountID]: appendRow(trade, accountStat) });
            }
        });
    }
    rowGetter(i) {
        const { accountID } = this.props;
        const { rows } = this.state[accountID];
        return rows[rows.length - 1 - i];
    }
    export() {
        const { accountID } = this.props;

        const data = json2csv({
            data  : this.state[accountID].rows,
            fields: [
                'id',
                'timestamp',
                'reference',
                'contract_type',
                'entry_tick',
                'exit_tick',
                'buy_price',
                'sell_price',
                'profit',
            ],
        });
        saveAs({ data, filename: 'logs.csv', type: 'text/csv;charset=utf-8' });
    }
    getAccountStat(accountID) {
        if (!(accountID in this.state)) {
            const initialInfo = this.state.initial;
            this.setState({ [accountID]: { ...initialInfo } });
            return initialInfo;
        }
        return this.state[accountID];
    }
    updateTable(info) {
        const timestamp = getTimestamp(info.date_start);
        const tradeObj = { reference: info.transaction_ids.buy, ...info, timestamp };
        const { accountID } = tradeObj;

        const trade = {
            ...tradeObj,
            profit: getProfit(tradeObj),
        };

        if (trade.is_expired && trade.is_sold && !trade.exit_tick) trade.exit_tick = '-';

        const { id } = this.state[accountID];
        const rows = this.state[accountID].rows.slice();
        const updatedRows = rows.map(row => {
            const { reference } = row;
            if (reference === trade.reference) {
                return {
                    reference,
                    ...trade,
                };
            }
            return row;
        });
        this.setState({ [accountID]: { id, rows: updatedRows } });
    }
    render() {
        const { accountID } = this.props;
        const rows = accountID in this.state ? this.state[accountID].rows : [];
        return (
            <div>
                <ReactDataGrid
                    columns={this.columns}
                    rowGetter={this.rowGetter.bind(this)}
                    rowsCount={rows.length}
                    minHeight={minHeight}
                    rowHeight={rowHeight}
                />
            </div>
        );
    }
}
