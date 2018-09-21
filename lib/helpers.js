const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');

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

helpers.createRandomString = length => {
    length = typeof length == 'number' && length > 0 ? length : false;
    if (length) {
        const possibleCharacters =
            'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let string = '';
        for (let i = 0; i < length; i++) {
            string += possibleCharacters.charAt(
                Math.floor(Math.random() * possibleCharacters.length)
            );
        }
        return string;
    } else {
        return false;
    }
};

helpers.sendTwilioSms = (phone, message, callbak) => {
    phone =
        typeof phone == 'string' && phone.trim().length > 0
            ? phone.trim()
            : false;
    message =
        typeof message == 'string' &&
        message.trim().length > 0 &&
        message.trim().length <= 1600
            ? message.trim()
            : false;
    if (phone && message) {
        const payload = {
            From: config.twilio.fromPhone,
            To: phone,
            Body: message
        };

        const stringPayload = querystring.stringify(payload);

        const requestDetails = {
            protocal: 'https:',
            hostname: 'api.twilio.com',
            method: 'POST',
            path: `/2010-04-01/Accounts/${
                config.twilio.accountSid
            }/Messages.json`,
            auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Contenty-Length': Buffer.byteLength(stringPayload)
            }
        };

        const request = https.request(requestDetails, response => {
            const status = response.statusCode;
            if (status == 200 || status == 201) {
                callbak(false);
            } else {
                callbak('Status code returned was ' + status);
            }
        });

        request.on('error', error => {
            callback(error);
        });

        request.write(stringPayload);

        request.end();
    } else {
        callbak('Given parameters are missing or invalid.');
    }
};

module.exports = helpers;
