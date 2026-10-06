const http = require('http');

http.get('http://localhost:3000/', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Body:', data));
}).on('error', (err) => {
  console.error('Request error:', err);
});
