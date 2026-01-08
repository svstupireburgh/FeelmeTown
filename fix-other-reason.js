// Fix "Other" reason
const fixOtherReason = async () => {
  try {
    console.log('🔄 Adding "Other" reason back...');
    
    const response = await fetch('http://localhost:3000/api/cancel-reasons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Other' })
    });
    
    const result = await response.json();
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
};

fixOtherReason();
