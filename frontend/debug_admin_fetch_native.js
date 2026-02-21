const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/admin/users',
    method: 'GET',
    headers: {
        'x-user-id': 'admin_user_1768150739848'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('BODY:', data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
