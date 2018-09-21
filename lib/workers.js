const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');

const dataLib = require('./data');
const helpers = require('./helpers');

const workers = {};

workers.validateCheckData = originalCheckData => {
    originalCheckData =
        typeof originalCheckData == 'object' && originalCheckData != null
            ? originalCheckData
            : {};
    originalCheckData.id =
        typeof originalCheckData.id == 'string' &&
        originalCheckData.id.trim().length == 20
            ? originalCheckData.id.trim()
            : false;
    OriginalCheckData.userPhone =
        typeof originalCheckData.userPhone == 'string' &&
        originalCheckData.userPhone.trim().length > 5
            ? originalCheckData.userPhone.trim()
            : false;
    originalCheckData.protocol =
        typeof originalCheckData.protocol == 'string' &&
        ['http', 'https'].indexOf(originalCheckData.protocol) > -1
            ? originalCheckData.protocol
            : false;
    originalCheckData.url =
        typeof originalCheckData.url == 'string' &&
        originalCheckData.url.trim().length > 0
            ? originalCheckData.url.trim()
            : false;
    originalCheckData.method =
        typeof originalCheckData.method == 'string' &&
        ['GET', 'POST', 'PUT', 'DELETE'].indexOf(originalCheckData.method) > -1
            ? originalCheckData.method
            : false;
    originalCheckData.successCodes =
        typeof originalCheckData.successCodes == 'object' &&
        originalCheckData.successCodes instanceof Array &&
        originalCheckData.successCodes.length > 0
            ? originalCheckData.successCodes
            : false;
    originalCheckData.timoutSeconds =
        typeof originalCheckData.timoutSeconds == 'number' &&
        originalCheckData.timoutSeconds % 1 == 0 &&
        originalCheckData.timoutSeconds >= 1 &&
        originalCheckData.timoutSeconds <= 5
            ? originalCheckData.timoutSeconds
            : false;

    originalCheckData.state =
        typeof originalCheckData.state == 'string' &&
        ['up', 'down'].indexOf(originalCheckData.state) > -1
            ? originalCheckData.state
            : 'down';
    originalCheckData.lastChecked =
        typeof originalCheckData.lastChecked == 'number' &&
        originalCheckData.lastChecked > 0
            ? originalCheckData.lastChecked
            : false;

    if (
        originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timoutSeconds
    ) {
        workers.performCheck(originalCheckData);
    } else {
        console.log(
            'Error: One of the checks is not properly formatted. Skipping it.'
        );
    }
};

workers.performCheck = checkData => {
    const checkOutcome = {
        error: false,
        responseCode: false
    };

    let outcomeSent = false;

    const parsedUrl = url.parse(
        checkData.protocol + '://' + checkData.url,
        true
    );
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path;

    const requestDetails = {
        protocol: `${checkData.protocol}:`,
        hostname: hostName,
        method: checkData.method,
        path: path,
        timeout: checkData.timoutSeconds * 1000
    };

    const moduleToUse = checkData.protocol == 'http' ? http : https;
    const req = moduleToUse.request(requestDetails, res => {
        const status = res.statusCode;
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('error', error => {
        checkOutcome.error = { error: true, value: error };
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('timeout', error => {
        checkOutcome.error = { error: true, value: 'Timeout exceeded.' };
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.end();
};

workers.processCheckOutcome = (checkData, checkOutcome) => {
    const state =
        !checkOutcome.error &&
        checkOutcome.responseCode &&
        checkData.successCodes.indexOf(checkOutcome.responseCode) > -1
            ? 'up'
            : 'down';
    const alertWarrented =
        checkData.lastChecked && checkData.state != state ? true : false;

    checkData.state = state;
    checkData.lastChecked = Date.now();

    dataLib.update('checks', checkData.id, checkData, error => {
        if (!error) {
            if (alertWarrented) {
                workers.alertUser(checkData);
            } else {
                console.log('Check outcome has not changed. No alert needed.');
            }
        } else {
            console.log('Error trying to save updates to one of the checks.');
        }
    });
};

workers.alertUser = checkData => {
    const message = `Alert: Your check for ${checkData.method} ${
        checkData.protocol
    }://${checkData.url} is currently ${checkData.state}`;
    helpers.sendTwilioSms(checkData.userPhone, message, error => {
        if (!error) {
            console.log(
                'Success: User was alerted to a status change in their check, via sms: ',
                message
            );
        } else {
            console.log(
                'Error: Could not send sms alert to user who had a state change in their check.'
            );
        }
    });
};

workers.gatherAllChecks = () => {
    dataLib.list('checks', (error, checks) => {
        if (!error && checks && checks.length > 0) {
            checks.forEach(check => {
                dataLib.read('checks', check, (error, originalCheckData) => {
                    if (!error && originalCheckData) {
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log("Error reading one of the check's data.");
                    }
                });
            });
        } else {
            console.log('Error: Could not find any checks to process.');
        }
    });
};

workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 5);
};

workers.init = () => {
    workers.gatherAllChecks();
    workers.loop();
};

module.exports = workers;
