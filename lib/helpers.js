const crypto = require('crypto');

const config = require('./config');

const helpers = {};

helpers.hash = password => {
    if (typeof password == 'string' && password.length > 0) {
        const hash = crypto
            .createHmac('sha256', config.hashSecret)
            .update(password)
            .digest('hex');
        return hash;
    } else {
        return false;
    }
};

helpers.parseJsonToObject = json => {
    try {
        const object = JSON.parse(json);
        return object;
    } catch (error) {
        return {};
    }
};

module.exports = helpers;
