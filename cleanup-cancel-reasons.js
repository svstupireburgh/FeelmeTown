// Cleanup script for cancel reasons
// Run this in your browser console on the Administrator cancel reasons page

async function cleanupCancelReasons() {
  console.log('🧹 Starting cancel reasons cleanup...');
  
  try {
    // First, get all current cancel reasons
    const response = await fetch('/api/admin/cancel-reasons', { cache: 'no-store' });
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ Failed to fetch cancel reasons:', data.error);
      return;
    }
    
    console.log('📋 Current cancel reasons:', data.cancelReasons);
    
    // Delete all existing reasons (except "Other" if it exists)
    for (const reason of data.cancelReasons) {
      if (reason.reason !== 'Other') {
        console.log('🗑️ Deleting:', reason.reason);
        const deleteResponse = await fetch(`/api/admin/cancel-reasons?id=${reason._id}`, {
          method: 'DELETE'
        });
        const deleteData = await deleteResponse.json();
        if (deleteData.success) {
          console.log('✅ Deleted:', reason.reason);
        } else {
          console.error('❌ Failed to delete:', reason.reason, deleteData.error);
        }
      }
    }
    
    // Add clean, simple reasons
    const cleanReasons = [
      'Personal Emergency',
      'Transportation Issue', 
      'Weather Conditions',
      'Health Issue',
      'Work Commitment',
      'Family Emergency',
      'Other'
    ];
    
    for (const reason of cleanReasons) {
      console.log('➕ Adding:', reason);
      const addResponse = await fetch('/api/admin/cancel-reasons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason,
          category: 'General',
          description: '',
          isActive: true
        })
      });
      
      const addData = await addResponse.json();
      if (addData.success) {
        console.log('✅ Added:', reason);
      } else {
        console.error('❌ Failed to add:', reason, addData.error);
      }
    }
    
    console.log('🎉 Cancel reasons cleanup completed!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupCancelReasons();
