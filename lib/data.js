const fs = require('fs');
const path = require('path');

const helpers = require('./helpers');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data, callback) => {
    fs.open(
        `${lib.baseDir}${dir}/${file}.json`,
        'wx',
        (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
                const stringData = JSON.stringify(data);
                fs.writeFile(fileDescriptor, stringData, error => {
                    if (!error) {
                        fs.close(fileDescriptor, error => {
                            if (!error) {
                                callback(false);
                            } else {
                                callback('Error closing new file.');
                            }
                        });
                    } else {
                        callback('Error writing to new file.');
                    }
                });
            } else {
                callback('Could not create new file, It may already exist.');
            }
        }
    );
};

lib.read = (dir, file, callback) => {
    fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', (error, data) => {
        if (!error && data) {
            const parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(error, data);
        }
    });
};

lib.update = (dir, file, data, callback) => {
    fs.open(
        `${lib.baseDir}${dir}/${file}.json`,
        'r+',
        (error, fileDescriptor) => {
            if (!error && fileDescriptor) {
                const stringData = JSON.stringify(data);
                fs.ftruncate(fileDescriptor, error => {
                    if (!error) {
                        fs.writeFile(fileDescriptor, stringData, error => {
                            if (!error) {
                                fs.close(fileDescriptor, error => {
                                    if (!error) {
                                        callback(false);
                                    } else {
                                        callback(
                                            'Error closing existing file.'
                                        );
                                    }
                                });
                            } else {
                                callback('Error writing to existing file.');
                            }
                        });
                    } else {
                        callback('Error truncating file.');
                    }
                });
            } else {
                callback(
                    'Could not open the file for updating, it may not exist yet.'
                );
            }
        }
    );
};

lib.delete = (dir, file, callback) => {
    fs.unlink(`${lib.baseDir}${dir}/${file}.json`, error => {
        if (!error) {
            callback(false);
        } else {
            callback('Error deleting file.');
        }
    });
};

module.exports = lib;