const dataLib = require('./data');
const helpers = require('./helpers');
const config = require('./config');

const usersHandlers = require('./handlers/users');
const tokensHandlers = require('./handlers/tokens');
const checksHandlers = require('./handlers/tokens');

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
            const token =
                typeof data.headers.token == 'string'
                    ? data.headers.token
                    : false;
            handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                if (tokenIsValid) {
                    dataLib.read('users', phone, (error, data) => {
                        if (!error && data) {
                            delete data.hashedPassword;
                            callback(200, data);
                        } else {
                            callback(404);
                        }
                    });
                } else {
                    callback(403, {
                        error:
                            'Missing required token in header, or token is invalid.'
                    });
                }
            });
        } else {
            callback(400, { error: 'Missing required field.' });
        }
    },
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
                const token =
                    typeof data.headers.token == 'string'
                        ? data.headers.token
                        : false;
                handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                    if (tokenIsValid) {
                        dataLib.read('users', phone, (error, userData) => {
                            if (!error && userData) {
                                if (firstName) userData.firstName = firstName;
                                if (lastName) userData.lastName = lastName;
                                if (password)
                                    userData.hashedPassword = helpers.hash(
                                        password
                                    );

                                dataLib.update(
                                    'users',
                                    phone,
                                    userData,
                                    error => {
                                        if (!error) {
                                            callback(200);
                                        } else {
                                            callback(500, {
                                                error:
                                                    'Could not update the user.'
                                            });
                                        }
                                    }
                                );
                            } else {
                                callback(400, {
                                    error: 'The specified user does not exist.'
                                });
                            }
                        });
                    } else {
                        callback(403, {
                            error:
                                'Missing required token in header, or token is invalid.'
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
    DELETE: (data, callback) => {
        const phone =
            typeof data.query.phone == 'string' && data.query.phone.length > 5
                ? data.query.phone.trim()
                : false;
        if (phone) {
            const token =
                typeof data.headers.token == 'string'
                    ? data.headers.token
                    : false;
            handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                if (tokenIsValid) {
                    dataLib.read('users', phone, (error, data) => {
                        if (!error && data) {
                            dataLib.delete('users', phone, error => {
                                if (!error) {
                                    const userChecks =
                                        typeof data.checks == 'object' &&
                                        data.checks instanceof Array
                                            ? data.checks
                                            : false;
                                    const checksToDelete = userChecks.length;
                                    if (checksToDelete > 0) {
                                        let checksDeleted = 0;
                                        let deletionError = false;

                                        userChecks.forEach(checkId => {
                                            dataLib.delete(
                                                'checks',
                                                checkId,
                                                error => {
                                                    if (error) {
                                                        deletionError = true;
                                                    }
                                                    checksDeleted++;
                                                    if (
                                                        checksDeleted ==
                                                        checksToDelete
                                                    ) {
                                                        if (!deletionError) {
                                                            callback(200);
                                                        } else {
                                                            callback(500, {
                                                                error:
                                                                    "Errors encountered while attempting to delete all of the user's checks. All checks may not be deleted from the database successfully."
                                                            });
                                                        }
                                                    }
                                                }
                                            );
                                        });
                                    } else {
                                        callback(200);
                                    }
                                } else
                                    callback(500, {
                                        error:
                                            'Could not delete the specified user.'
                                    });
                            });
                        } else {
                            callback(400, {
                                error: 'Could not find the specified user.'
                            });
                        }
                    });
                } else {
                    callback(403, {
                        error:
                            'Missing required token in header, or token is invalid.'
                    });
                }
            });
        } else {
            callback(400, { error: 'Missing required field.' });
        }
    }
};

handlers.tokens = (data, callback) => {
    const acceptableMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._tokens = {
    GET: (data, callback) => {
        const id =
            typeof data.query.id == 'string' &&
            data.query.id.trim().length == 20
                ? data.query.id
                : false;
        if (id) {
            dataLib.read('tokens', id, (error, tokenData) => {
                if (!error && tokenData) {
                    callback(200, tokenData);
                } else {
                    callback(404);
                }
            });
        } else {
            callback(400, { error: 'Missing required fields.' });
        }
    },
    POST: (data, callback) => {
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
        if (phone && password) {
            dataLib.read('users', phone, (error, userData) => {
                if (!error && userData) {
                    const hashedPassword = helpers.hash(password);
                    if (hashedPassword == userData.hashedPassword) {
                        const tokenId = helpers.createRandomString(20);
                        const expires = Date.now() + 1000 * 60 * 60;
                        const tokenObject = { phone, id: tokenId, expires };
                        dataLib.create(
                            'tokens',
                            tokenId,
                            tokenObject,
                            error => {
                                if (!error) {
                                    callback(200, tokenObject);
                                } else {
                                    callback(500, {
                                        error:
                                            'Could not create a new token. Please try again later.'
                                    });
                                }
                            }
                        );
                    } else {
                        callback(400, {
                            error:
                                "Password did not match the specified user's stored password."
                        });
                    }
                } else {
                    callback(400, {
                        error: 'Could not find the specified user.'
                    });
                }
            });
        } else {
            callback(400, { error: 'Missing required fields.' });
        }
    },
    PUT: (data, callback) => {
        const id =
            typeof data.payload.id == 'string' &&
            data.payload.id.trim().length == 20
                ? data.payload.id
                : false;
        const extend =
            typeof data.payload.extend == 'boolean' &&
            data.payload.extend == true
                ? true
                : false;
        if (id && extend) {
            dataLib.read('tokens', id, (error, tokenData) => {
                if (!error && tokenData) {
                    if (tokenData.expires > Date.now()) {
                        tokenData.expires = Date.now() + 1000 * 60 * 60;
                        dataLib.update('tokens', id, tokenData, error => {
                            if (!error) {
                                callback(200);
                            } else {
                                callback(500, {
                                    error:
                                        "Could not update the token's expiration."
                                });
                            }
                        });
                    } else {
                        callback(400, {
                            error:
                                'The token has already expired and cannot be extended.'
                        });
                    }
                } else {
                    callback(400, { error: 'Specified token does not exist.' });
                }
            });
        } else {
            callback(400, {
                error: 'Missing requried fields or fields are invalid.'
            });
        }
    },
    DELETE: (data, callback) => {
        const id =
            typeof data.query.id == 'string' &&
            data.query.id.trim().length == 20
                ? data.query.id.trim()
                : false;
        if (id) {
            dataLib.read('tokens', id, (error, data) => {
                if (!error && data) {
                    dataLib.delete('tokens', id, error => {
                        if (!error) {
                            callback(200);
                        } else {
                            callback(500, {
                                error: 'Could not delete the specified token.'
                            });
                        }
                    });
                } else {
                    callback(400, {
                        error: 'Could not find the specified token.'
                    });
                }
            });
        } else {
            callback(400, { error: 'Missing required fields.' });
        }
    },
    verifyToken: (id, phone, callback) => {
        dataLib.read('tokens', id, (error, tokenData) => {
            if (!error && tokenData) {
                if (
                    tokenData.phone == phone &&
                    tokenData.expires > Date.now()
                ) {
                    callback(true);
                } else {
                    callback(false);
                }
            } else {
                callback(false);
            }
        });
    }
};

handlers.checks = (data, callback) => {
    const acceptableMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._checks = {
    GET: (data, callback) => {
        const id =
            typeof data.query.id == 'string' &&
            data.query.id.trim().length == 20
                ? data.query.id.trim()
                : false;
        if (id) {
            dataLib.read('checks', id, (error, checkData) => {
                if (!error && checkData) {
                    const token =
                        typeof data.headers.token == 'string'
                            ? data.headers.token
                            : false;
                    handlers._tokens.verifyToken(
                        token,
                        checkData.userPhone,
                        tokenIsValid => {
                            if (tokenIsValid) {
                                callback(200, checkData);
                            } else {
                                callback(403);
                            }
                        }
                    );
                } else {
                    callback(404);
                }
            });
        } else {
            callback(400, { error: 'Missing required fields.' });
        }
    },
    POST: (data, callback) => {
        const protocol =
            typeof data.payload.protocol == 'string' &&
            ['http', 'https'].indexOf(data.payload.protocol) > -1
                ? data.payload.protocol
                : false;
        const url =
            typeof data.payload.url == 'string' &&
            data.payload.url.trim().length > 0
                ? data.payload.url.trim()
                : false;
        const method =
            typeof data.payload.method == 'string' &&
            ['GET', 'POST', 'PUT', 'DELETE'].indexOf(data.payload.method) > -1
                ? data.payload.method
                : false;
        const successCodes =
            typeof data.payload.successCodes == 'object' &&
            data.payload.successCodes instanceof Array &&
            data.payload.successCodes.length > 0
                ? data.payload.successCodes
                : false;
        const timeoutSeconds =
            typeof data.payload.timeoutSeconds == 'number' &&
            data.payload.timeoutSeconds % 1 == 0 &&
            data.payload.timeoutSeconds >= 1 &&
            data.payload.timeoutSeconds <= 5
                ? data.payload.timeoutSeconds
                : false;
        if (protocol && url && successCodes && timeoutSeconds) {
            const token =
                typeof data.headers.token == 'string'
                    ? data.headers.token
                    : false;
            dataLib.read('tokens', token, (error, tokenData) => {
                if (!error && tokenData) {
                    const userPhone = tokenData.phone;
                    dataLib.read('users', userPhone, (error, userData) => {
                        if (!error && userData) {
                            const userChecks =
                                typeof userData.checks == 'object' &&
                                userData.checks instanceof Array
                                    ? userData.checks
                                    : [];
                            if (userChecks.length < config.maxChecks) {
                                const checkId = helpers.createRandomString(20);
                                const checkObject = {
                                    id: checkId,
                                    userPhone,
                                    protocol,
                                    url,
                                    method,
                                    successCodes,
                                    timeoutSeconds
                                };
                                dataLib.create(
                                    'checks',
                                    checkId,
                                    checkObject,
                                    error => {
                                        if (!error) {
                                            userData.checks = userChecks;
                                            userData.checks.push(checkId);
                                            dataLib.update(
                                                'users',
                                                userPhone,
                                                userData,
                                                error => {
                                                    if (!error) {
                                                        callback(
                                                            200,
                                                            checkObject
                                                        );
                                                    } else {
                                                        callback(500, {
                                                            error:
                                                                'Could not update the user with the new check.'
                                                        });
                                                    }
                                                }
                                            );
                                        } else {
                                            callback(500, {
                                                error:
                                                    'Could not create the new check.'
                                            });
                                        }
                                    }
                                );
                            } else {
                                callback(400, {
                                    error: `The user already has the maximum number of checks (${
                                        config.maxChecks
                                    }).`
                                });
                            }
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(403);
                }
            });
        } else {
            callback(400, {
                error: 'Missing required inputs, or inputs are invalid.'
            });
        }
    },
    PUT: (data, callback) => {
        const id =
            typeof data.payload.id == 'string' &&
            data.payload.id.trim().length == 20
                ? data.payload.id.trim()
                : false;
        const protocol =
            typeof data.payload.protocol == 'string' &&
            ['http', 'https'].indexOf(data.payload.protocol) > -1
                ? data.payload.protocol
                : false;
        const url =
            typeof data.payload.url == 'string' &&
            data.payload.url.trim().length > 0
                ? data.payload.url.trim()
                : false;
        const method =
            typeof data.payload.method == 'string' &&
            ['GET', 'POST', 'PUT', 'DELETE'].indexOf(data.payload.method) > -1
                ? data.payload.method
                : false;
        const successCodes =
            typeof data.payload.successCodes == 'object' &&
            data.payload.successCodes instanceof Array &&
            data.payload.successCodes.length > 0
                ? data.payload.successCodes
                : false;
        const timeoutSeconds =
            typeof data.payload.timeoutSeconds == 'number' &&
            data.payload.timeoutSeconds % 1 == 0 &&
            data.payload.timeoutSeconds >= 1 &&
            data.payload.timeoutSeconds <= 5
                ? data.payload.timeoutSeconds
                : false;
        if (id) {
            if (protocol || url || method || successCodes || timeoutSeconds) {
                dataLib.read('checks', id, (error, checkData) => {
                    if (!error && checkData) {
                        const token =
                            typeof data.headers.token == 'string'
                                ? data.headers.token
                                : false;
                        handlers._tokens.verifyToken(
                            token,
                            checkData.userPhone,
                            tokenIsValid => {
                                if (tokenIsValid) {
                                    if (protocol) checkData.protocol = protocol;
                                    if (url) checkData.url = url;
                                    if (method) checkData.method = method;
                                    if (successCodes)
                                        checkData.successCodes = successCodes;
                                    if (timeoutSeconds)
                                        checkData.timeoutSeconds = timeoutSeconds;
                                    dataLib.update(
                                        'checks',
                                        id,
                                        checkData,
                                        error => {
                                            if (!error) callback(200);
                                            else
                                                callback(500, {
                                                    error:
                                                        'Could not update the check.'
                                                });
                                        }
                                    );
                                } else {
                                    callback(403);
                                }
                            }
                        );
                    } else {
                        callback(400, { error: 'Check ID did not exist.' });
                    }
                });
            } else {
                callback(400, { error: 'Missing fields to update.' });
            }
        } else {
            callback(400, { error: 'Missing required fields.' });
        }
    },
    DELETE: (data, callback) => {
        const id =
            typeof data.query.id == 'string' &&
            data.query.id.trim().length == 20
                ? data.query.id.trim()
                : false;
        if (id) {
            dataLib.read('checks', id, (error, checkData) => {
                if (!error && checkData) {
                    const token =
                        typeof data.headers.token == 'string'
                            ? data.headers.token
                            : false;
                    handlers._tokens.verifyToken(
                        token,
                        checkData.userPhone,
                        tokenIsValid => {
                            if (tokenIsValid) {
                                dataLib.delete('checks', id, error => {
                                    if (!error) {
                                        dataLib.read(
                                            'users',
                                            checkData.userPhone,
                                            (error, userData) => {
                                                if ((!error, userData)) {
                                                    const userChecks =
                                                        typeof userData.checks ==
                                                            'object' &&
                                                        userData.checks instanceof
                                                            Array
                                                            ? userData.checks
                                                            : [];
                                                    const checkPosition = userChecks.indexOf(
                                                        id
                                                    );
                                                    if (checkPosition > -1) {
                                                        userChecks.splice(
                                                            checkPosition,
                                                            1
                                                        );
                                                        dataLib.update(
                                                            'users',
                                                            checkData.userPhone,
                                                            userData,
                                                            error => {
                                                                if (!error)
                                                                    callback(
                                                                        200
                                                                    );
                                                                else
                                                                    callback(
                                                                        500,
                                                                        {
                                                                            error:
                                                                                'Could not update the user.'
                                                                        }
                                                                    );
                                                            }
                                                        );
                                                    } else {
                                                        callback(500, {
                                                            error:
                                                                "Could not find the check on the user's object. So could not remove it."
                                                        });
                                                    }
                                                } else {
                                                    callback(500, {
                                                        error:
                                                            'Could not find the user who created the user. So could not remove the check from the list of checks on the user object.'
                                                    });
                                                }
                                            }
                                        );
                                    } else {
                                        callback(500, {
                                            error: 'Could not delete the check.'
                                        });
                                    }
                                });
                            } else {
                                callback(403);
                            }
                        }
                    );
                } else {
                    callback(400, {
                        error: 'The specified check ID does not exist.'
                    });
                }
            });
        } else {
            callback(400, { error: 'Missing required fields.' });
        }
    }
};

handlers.notFound = (data, callback) => {
    callback(404);
};

module.exports = handlers;
