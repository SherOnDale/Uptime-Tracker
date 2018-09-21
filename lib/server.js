const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const StringDecoder = require('string_decoder').StringDecoder;

const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

const server = {};

server.httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};

server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

server.httpsServer = https.createServer(
    server.httpsServerOptions,
    (req, res) => {
        server.unifiedServer(req, res);
    }
);

server.unifiedServer = (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    const query = parsedUrl.query;

    const method = req.method.toUpperCase();

    const headers = req.headers;

    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', data => {
        buffer += decoder.write(data);
    });
    req.on('end', () => {
        buffer += decoder.end();

        // console.log(
        //     `${method} ${trimmedPath} Query: ${JSON.stringify(
        //         query
        //     )} Headers: ${JSON.stringify(headers)} Payload: ${buffer}`
        // );

        const chosenHandler =
            typeof server.router[trimmedPath] !== 'undefined'
                ? server.router[trimmedPath]
                : handlers.notFound;

        const data = {
            trimmedPath,
            query,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        };

        chosenHandler(data, (statusCode = 200, payload = {}) => {
            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // console.log('Returning this response', statusCode, payload);
        });
    });
};

server.router = {
    ping: handlers.ping,
    users: handlers.users,
    tokens: handlers.tokens,
    checks: handlers.checks
};

server.init = () => {
    server.httpServer.listen(config.httpPort, () =>
        console.log(
            `The server is listening on port ${config.httpPort} in ${
                config.envName
            } mode`
        )
    );

    server.httpsServer.listen(config.httpsPort, () => {
        console.log(
            `The server is listening on port ${config.httpsPort} in ${
                config.envName
            } mode`
        );
    });
};

module.exports = server;
