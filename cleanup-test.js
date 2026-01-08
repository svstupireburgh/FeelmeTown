// Cleanup test reasons
const cleanup = async () => {
  try {
    console.log('🧹 Cleaning up test reasons...');
    
    // Remove test reason
    const removeResponse = await fetch('http://localhost:3000/api/cancel-reasons', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Admin Test - Server Issue' })
    });
    
    const removeResult = await removeResponse.json();
    console.log('Remove result:', removeResult);
    
    // Also remove "kuch nhi" if it exists
    const removeKuchResponse = await fetch('http://localhost:3000/api/cancel-reasons', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'kuch nhi' })
    });
    
    const removeKuchResult = await removeKuchResponse.json();
    console.log('Remove kuch nhi result:', removeKuchResult);
    
    // Final list
    const finalResponse = await fetch('http://localhost:3000/api/cancel-reasons');
    const finalResult = await finalResponse.json();
    console.log('Final clean list:', finalResult.reasons);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
};

cleanup();
