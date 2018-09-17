const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;

const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

const httpsServerOptions = {
    key: fs.readFileSync('./https/key.pem'),
    cert: fs.readFileSync('./https/cert.pem')
};

const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
});

httpServer.listen(config.httpPort, () =>
    console.log(
        `The server is listening on port ${config.httpPort} in ${
            config.envName
        } mode`
    )
);

httpsServer.listen(config.httpsPort, () => {
    console.log(
        `The server is listening on port ${config.httpsPort} in ${
            config.envName
        } mode`
    );
});

const unifiedServer = (req, res) => {
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
            typeof router[trimmedPath] !== 'undefined'
                ? router[trimmedPath]
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

const router = {
    ping: handlers.ping,
    users: handlers.users
};
