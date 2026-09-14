const fs = require('fs');
const https = require('https');

const seedJson = fs.readFileSync('scratch/seedData.json', 'utf8');
const seedObj = JSON.parse(seedJson);

// 1. Update src/services/dbService.js INITIAL_LOCAL_STATE
const dbServicePath = 'src/services/dbService.js';
let dbServiceContent = fs.readFileSync(dbServicePath, 'utf8');

const regex = /const INITIAL_LOCAL_STATE = [\s\S]*?;\n\n\/\/ Helper:/;
const replacement = `const INITIAL_LOCAL_STATE = ${JSON.stringify(seedObj, null, 2)};\n\n// Helper:`;

if (!regex.test(dbServiceContent)) {
  console.error('Could not find INITIAL_LOCAL_STATE pattern in dbService.js');
} else {
  dbServiceContent = dbServiceContent.replace(regex, replacement);
  fs.writeFileSync(dbServicePath, dbServiceContent);
  console.log('Successfully updated INITIAL_LOCAL_STATE in src/services/dbService.js!');
}

// 2. Upload seedObj to Firebase Realtime Database via HTTPS PUT
const postData = JSON.stringify(seedObj);

const options = {
  hostname: 'kg-poultry-farms-default-rtdb.firebaseio.com',
  port: 443,
  path: '/.json',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`Firebase Reset Status Code: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Firebase Database overwrite response completed!');
  });
});

req.on('error', (e) => {
  console.error('Firebase PUT error:', e);
});

req.write(postData);
req.end();
