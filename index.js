const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    const queryStringObject = parsedUrl.query;

    const method = req.method.toUpperCase();

    const headers = req.headers;

    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', data => {
        buffer += decoder.write(data);
    });
    req.on('end', () => {
        buffer += decoder.end();

        console.log(
            `${method} ${trimmedPath} Query: ${JSON.stringify(
                queryStringObject
            )} Headers: ${JSON.stringify(headers)} Payload: ${buffer}`
        );

        const chosenHandler =
            typeof router[trimmedPath] !== 'undefined'
                ? router[trimmedPath]
                : handlers.notFound;

        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: buffer
        };

        chosenHandler(data, (statusCode = 200, payload = {}) => {
            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            console.log('Returning this response', statusCode, payload);
        });
    });
});

server.listen(3000, () => console.log('The server is listening on port 3000'));

const handlers = {};

handlers.sample = (data, callback) => {
    callback(406, { name: 'sample handler' });
};

handlers.notFound = (data, callback) => {
    callback(404);
};

const router = {
    sample: handlers.sample
};
