import { generateLiveApiInstance } from '../../common/appId';
import { getTokenList } from '../../common/utils/storageManager';
import { setCookieBinary } from '../../common/utils/cookieManager';

const euCountries = [
    'it',
    'de',
    'fr',
    'lu',
    'gr',
    'es',
    'sk',
    'lt',
    'nl',
    'at',
    'bg',
    'si',
    'cy',
    'be',
    'ro',
    'hr',
    'pt',
    'pl',
    'lv',
    'ee',
    'cz',
    'fi',
    'hu',
    'dk',
    'se',
    'ie',
    'gb',
    'mt',
];

export const isEuCountry = country => euCountries.includes(country);

export const isUKCountry = country => country === 'gb';

/* eslint-disable camelcase */
export const moveToDeriv = async () => {
    const clients_country = await getClientsCountryByIP();
    const tokenList = getTokenList();
    const landingCompanyName = tokenList.map(token => token.loginInfo.landing_company_name);

    if (!tokenList.length) {
        if (isEuCountry(clients_country) || isUKCountry(clients_country)) {
            window.location.replace('https://binary.com/move-to-deriv');
        }
        // redirect ROW clients to move-to-deriv by default
        else {
            window.location.replace('https://binary.bot/move-to-deriv');
            setCookieBinary();
        }
    }

    if (
        (landingCompanyName.length === 1 &&
            landingCompanyName.includes('virtual') &&
            (isEuCountry(clients_country) ||
                isUKCountry(clients_country) ||
                isEuCountry(localStorage.getItem('residence')) ||
                isUKCountry(localStorage.getItem('residence')))) ||
        landingCompanyName.includes('maltainvest') ||
        landingCompanyName.includes('malta') ||
        landingCompanyName.includes('iom')
    ) {
        window.location.replace('https://binary.com/move-to-deriv');
    }
};

export const getClientsCountryByIP = async () => {
    const api = generateLiveApiInstance();
    const { website_status } = await api.send({ website_status: 1 });
    return website_status.clients_country;
};
