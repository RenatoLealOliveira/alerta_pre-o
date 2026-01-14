const http = require('http');

function testUrl(path) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'GET'
    };

    console.log(`Testing: http://localhost:3000${path}`);

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log(`RESPONSE: ${data.substring(0, 100)}...`); // Preview output
        });
    });

    req.on('error', (e) => {
        console.error(`ERROR: ${e.message}`);
    });

    req.end();
}

testUrl('/autosuggest?q=iphone');
testUrl('/search?query=test&ml=true');
