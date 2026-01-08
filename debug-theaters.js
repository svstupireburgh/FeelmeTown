// Debug script to check theaters specifically
const http = require('http');

function debugTheaters() {
  console.log('🔍 Debugging theaters issue...');
  
  // Test 1: Check admin theaters API
  console.log('\n1️⃣ Testing /api/admin/theaters...');
  
  const options1 = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/theaters',
    method: 'GET'
  };
  
  const req1 = http.request(options1, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ Admin theaters API response:');
        console.log('   Status:', res.statusCode);
        console.log('   Theaters count:', result.theaters?.length || 0);
        console.log('   First theater:', result.theaters?.[0]?.name || 'None');
        
        // Test 2: Now test AI Memory update
        console.log('\n2️⃣ Testing AI Memory update...');
        testAIMemoryUpdate();
        
      } catch (error) {
        console.log('❌ Failed to parse admin theaters response:', error.message);
      }
    });
  });
  
  req1.on('error', (error) => {
    console.error('❌ Admin theaters API error:', error.message);
  });
  
  req1.end();
}

function testAIMemoryUpdate() {
  const options2 = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/ai-memory/update',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };
  
  const req2 = http.request(options2, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ AI Memory update response:');
        console.log('   Status:', res.statusCode);
        console.log('   Success:', result.success);
        console.log('   Files updated:', result.files);
        
        // Now check the theaters.json file content
        setTimeout(() => {
          console.log('\n3️⃣ Check theaters.json file...');
          console.log('   Please check: src/ai-memory/theaters.json');
        }, 1000);
        
      } catch (error) {
        console.log('❌ Failed to parse AI Memory response:', error.message);
      }
    });
  });
  
  req2.on('error', (error) => {
    console.error('❌ AI Memory update error:', error.message);
  });
  
  req2.write('{}');
  req2.end();
}

debugTheaters();
