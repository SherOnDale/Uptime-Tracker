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

        res.end(`Hello World\n`);

        console.log(
            `${method} ${trimmedPath} Query: ${JSON.stringify(
                queryStringObject
            )} Headers: ${JSON.stringify(headers)} Payload: ${buffer}`
        );
    });
});

server.listen(3000, () => console.log('The server is listening on port 3000'));
