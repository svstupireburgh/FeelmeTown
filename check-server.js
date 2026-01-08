// Check if Next.js server is running
const http = require('http');

function checkServer() {
  console.log('🔍 Checking if Next.js server is running on localhost:3000...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  };
  
  const req = http.request(options, (res) => {
    console.log('✅ Server is running! Status:', res.statusCode);
    console.log('Now you can run: node test-ai-memory.js');
  });
  
  req.on('error', (error) => {
    console.log('❌ Server is not running or not accessible');
    console.log('Please start your Next.js server first:');
    console.log('npm run dev');
    console.log('or');
    console.log('yarn dev');
  });
  
  req.on('timeout', () => {
    console.log('⏰ Server check timed out');
    req.destroy();
  });
  
  req.end();
}

checkServer();
