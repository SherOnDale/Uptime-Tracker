const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    const queryStringObject = parsedUrl.query;

    const method = req.method.toUpperCase();

    const headers = req.headers;

    res.end(`Hello World\n`);

    console.log(
        `${method} ${trimmedPath} Query: ${JSON.stringify(
            queryStringObject
        )} Headers: ${JSON.stringify(headers)}`
    );
});

server.listen(3000, () => console.log('The server is listening on port 3000'));
