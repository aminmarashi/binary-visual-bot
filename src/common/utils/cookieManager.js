const Cookies = require('js-cookie');

export const CookieStorage = function(cookieName, cookieDomain) {
    this.initialized = false;
    this.cookieName = cookieName;
    this.domain = cookieDomain;
    this.path = '/';
    this.expires = new Date('Thu, 1 Jan 2037 12:00:00 GMT');
    this.value = {};
};

CookieStorage.prototype = {
    read() {
        const cookieValue = Cookies.get(this.cookieName);
        try {
            this.value = cookieValue ? JSON.parse(cookieValue) : {};
        } catch (e) {
            this.value = {};
        }
        this.initialized = true;
    },
    write(val, expireDate, isSecure, sameSite) {
        if (!this.initialized) this.read();
        this.value = val;
        if (expireDate) this.expires = expireDate;
        Cookies.set(this.cookieName, this.value, {
            expires : this.expires,
            path    : this.path,
            domain  : this.domain,
            secure  : !!isSecure,
            sameSite: sameSite || 'strict',
        });
    },
    get(key) {
        if (!this.initialized) this.read();
        return this.value[key];
    },
    set(key, val, options) {
        if (!this.initialized) this.read();
        this.value[key] = val;
        Cookies.set(this.cookieName, this.value, {
            expires: new Date(this.expires),
            path   : this.path,
            domain : this.domain,
            ...options,
        });
    },
    remove() {
        Cookies.remove(this.cookieName, {
            path  : this.path,
            domain: this.domain,
        });
    },
};

export const setCookieLanguage = lang => {
    if (!Cookies.get('language') || lang) {
        const cookie = new CookieStorage('language');
        cookie.write(lang.toUpperCase(), undefined, true, 'none');
    }
};

export const setCookieBinary = () => {
    if (!Cookies.get('binary-com')) {
        window.location.replace('https://binary.bot/move-to-deriv');
    } else {
        Cookies.set('binary-com', true, {
            expires: 15,
        });
        window.location.replace('https://binary.com');
    }
};
