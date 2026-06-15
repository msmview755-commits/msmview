const https = require('https');

function testPreflight() {
  const options = {
    hostname: 'msmview.onrender.com',
    port: 443,
    path: '/api/auth/login',
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://msmview.vercel.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  };

  console.log('Sending CORS preflight OPTIONS request to Render...');
  const req = https.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.end();
}

testPreflight();
