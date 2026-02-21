const http = require('http');

const endpoints = [
    '/api/products',
    '/api/banners',
    '/api/home-layout'
];

endpoints.forEach(endpoint => {
    const req = http.request({
        hostname: 'localhost',
        port: 5001,
        path: endpoint,
        method: 'GET'
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`\n--- ${endpoint} ---`);
            console.log(`Status: ${res.statusCode}`);
            try {
                const json = JSON.parse(data);
                console.log("Keys:", Object.keys(json));
                if (endpoint === '/api/banners') {
                    console.log("Banners type:", Array.isArray(json.banners) ? 'Array' : typeof json.banners);
                }
            } catch (e) {
                console.log("Response is NOT JSON:", data.substring(0, 50));
            }
        });
    });
    req.on('error', e => console.error(`${endpoint} Error: ${e.message}`));
    req.end();
});
