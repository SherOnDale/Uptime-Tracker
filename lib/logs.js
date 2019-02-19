const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};

lib.baseDir = path.join(__dirname, '../.logs/');

lib.append = (file, string, callback) => {
    fs.open(`${lib.baseDir}${file}.log`, 'a', (error, fileDescriptor) => {
        if (!error && fileDescriptor) {
            fs.appendFile(fileDescriptor, string + '\n', error => {
                if (!error) {
                    fs.close(fileDescriptor, error => {
                        if (!error) {
                            callback(false);
                        } else {
                            callback(
                                'Error closing file that was being appended.'
                            );
                        }
                    });
                } else {
                    callback('Error appending to file.');
                }
            });
        } else {
            callback('Could not open file for appending.');
        }
    });
};

module.exports = lib;
