const dataLib = require('./data');
const helpers = require('./helpers');

const handlers = {};

handlers.ping = (data, callback) => {
    callback(200);
};

handlers.users = (data, callback) => {
    const acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._users = {
    GET: (data, callback) => {
        const phone =
            typeof data.query.phone == 'string' && data.query.phone.length > 5
                ? data.query.phone.trim()
                : false;
        if (phone) {
            dataLib.read('users', phone, (error, data) => {
                if (!error && data) {
                    delete data.hashedPassword;
                    callback(200, data);
                } else {
                    callback(404);
                }
            });
        } else {
            callback(400, { error: 'Missing required field.' });
        }
    },
    //TODO: implement authentication
    POST: (data, callback) => {
        const firstName =
            typeof data.payload.firstName == 'string' &&
            data.payload.firstName.trim().length > 0
                ? data.payload.firstName.trim()
                : false;
        const lastName =
            typeof data.payload.lastName == 'string' &&
            data.payload.lastName.trim().length > 0
                ? data.payload.lastName.trim()
                : false;
        const phone =
            typeof data.payload.phone == 'string' &&
            data.payload.phone.trim().length > 5
                ? data.payload.phone.trim()
                : false;
        const password =
            typeof data.payload.password == 'string' &&
            data.payload.password.trim().length > 0
                ? data.payload.password.trim()
                : false;
        const tosAgreement =
            typeof data.payload.tosAgreement == 'boolean' &&
            data.payload.tosAgreement == true
                ? true
                : false;

        if (firstName && lastName && phone && password && tosAgreement) {
            dataLib.read('users', phone, (error, data) => {
                if (error) {
                    const hashedPassword = helpers.hash(password);

                    if (hashedPassword) {
                        const userObject = {
                            firstName,
                            lastName,
                            phone,
                            hashedPassword,
                            tosAgreement
                        };
                        dataLib.create('users', phone, userObject, error => {
                            if (!error) {
                                callback(200);
                            } else {
                                callback(500, {
                                    error: 'Could not create a new user.'
                                });
                            }
                        });
                    } else {
                        callback(500, {
                            error: "Could not hash the user's password"
                        });
                    }
                } else {
                    callback(400, {
                        error: 'A user with the phone number already exists.'
                    });
                }
            });
        } else {
            callback(400, { error: 'Missing required fields.' });
        }
    },
    //TODO: implement authentication
    PUT: (data, callback) => {
        const phone =
            typeof data.payload.phone === 'string' &&
            data.payload.phone.trim().length > 5
                ? data.payload.phone
                : false;

        const firstName =
            typeof data.payload.firstName == 'string' &&
            data.payload.firstName.trim().length > 0
                ? data.payload.firstName.trim()
                : false;
        const lastName =
            typeof data.payload.lastName == 'string' &&
            data.payload.lastName.trim().length > 0
                ? data.payload.lastName.trim()
                : false;
        const password =
            typeof data.payload.password == 'string' &&
            data.payload.password.trim().length > 0
                ? data.payload.password.trim()
                : false;

        if (phone) {
            if (firstName || lastName || password) {
                dataLib.read('users', phone, (error, userData) => {
                    if (!error && userData) {
                        if (firstName) userData.firstName = firstName;
                        if (lastName) userData.lastName = lastName;
                        if (password)
                            userData.hashedPassword = helpers.hash(password);

                        dataLib.update('users', phone, userData, error => {
                            if (!error) {
                                callback(200);
                            } else {
                                callback(500, {
                                    error: 'Could not update the user.'
                                });
                            }
                        });
                    } else {
                        callback(400, {
                            error: 'The specified user does not exist.'
                        });
                    }
                });
            } else {
                callback(400, { error: 'Missing fields to update.' });
            }
        } else {
            callback(400, { error: 'Misssing required field.' });
        }
    },
    //TODO: authentication
    //TODO: delete other associated files
    DELETE: (data, callback) => {
        const phone =
            typeof data.query.phone == 'string' && data.query.phone.length > 5
                ? data.query.phone.trim()
                : false;
        if (phone) {
            dataLib.read('users', phone, (error, data) => {
                if (!error && data) {
                    dataLib.delete('users', phone, error => {
                        if (!error) callback(200);
                        else
                            callback(500, {
                                error: 'Could not delete the specified user.'
                            });
                    });
                } else {
                    callback(400, {
                        error: 'Could not find the specified user.'
                    });
                }
            });
        } else {
            callback(400, { error: 'Missing required field.' });
        }
    }
};

handlers.notFound = (data, callback) => {
    callback(404);
};

module.exports = handlers;
