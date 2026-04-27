const http = require('http');
const data = JSON.stringify({
    aadhaar: "123456789012", voterNumber: "A123", phoneNumber: "9999999999", state: "Delhi"
});

const req = http.request({
    hostname: 'localhost', port: 5000, path: '/api/auth/authenticate',
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, (res) => {
    let raw = '';
    res.on('data', chunk => raw+=chunk);
    res.on('end', () => console.log('RESPONSE:', raw));
});
req.on('error', (e) => console.error("req error:", e.message));
req.write(data);
req.end();
