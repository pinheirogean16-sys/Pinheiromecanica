const http = require('http');

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log("Fetching from localhost:3000/api/diagnosticos...");
  try {
    const res = await getJSON('http://localhost:3000/api/diagnosticos');
    console.log(`STATUS: ${res.status}`);
    console.log("BODY:", JSON.stringify(res.body, null, 2));
  } catch (err) {
    console.error("Failed to fetch diagnostics:", err.message);
  }
}

run();
