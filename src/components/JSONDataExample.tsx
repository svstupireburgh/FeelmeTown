import React from 'react';
import { usePricing, useCounters, useAIMemory } from '@/hooks/useJSONData';

// Example component showing how to use JSON data operations
export default function JSONDataExample() {
  const { pricing, loading: pricingLoading, updatePricing } = usePricing();
  const { counters, loading: countersLoading } = useCounters();
  const { memory, loading: memoryLoading } = useAIMemory();

  const handleUpdatePricing = async () => {
    try {
      const newPricing = {
        slotBookingFee: 500,
        extraGuestFee: 700,
        convenienceFee: 50,
        decorationFees: 800
      };
      
      await updatePricing(newPricing);
      alert('Pricing updated successfully!');
    } catch (error) {
      alert('Failed to update pricing: ' + error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">JSON Data Operations Example</h1>
      
      {/* Pricing Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Pricing Data</h2>
        {pricingLoading ? (
          <p>Loading pricing...</p>
        ) : pricing ? (
          <div>
            <pre className="bg-gray-100 p-3 rounded text-sm">
              {JSON.stringify(pricing, null, 2)}
            </pre>
            <button 
              onClick={handleUpdatePricing}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Update Pricing
            </button>
          </div>
        ) : (
          <p>No pricing data available</p>
        )}
      </div>

      {/* Counters Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Counters Data</h2>
        {countersLoading ? (
          <p>Loading counters...</p>
        ) : counters ? (
          <pre className="bg-gray-100 p-3 rounded text-sm">
            {JSON.stringify(counters, null, 2)}
          </pre>
        ) : (
          <p>No counters data available</p>
        )}
      </div>

      {/* AI Memory Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">AI Memory Data</h2>
        {memoryLoading ? (
          <p>Loading AI memory...</p>
        ) : memory ? (
          <pre className="bg-gray-100 p-3 rounded text-sm max-h-96 overflow-auto">
            {JSON.stringify(memory, null, 2)}
          </pre>
        ) : (
          <p>No AI memory data available</p>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">How to Use JSON Data in Your Components:</h3>
        <div className="text-sm space-y-2">
          <p><strong>1. Import the hook:</strong></p>
          <code className="block bg-gray-100 p-2 rounded">
            {`import { usePricing, useCounters } from '@/hooks/useJSONData';`}
          </code>
          
          <p><strong>2. Use in your component:</strong></p>
          <code className="block bg-gray-100 p-2 rounded">
            {`const { pricing, loading, updatePricing } = usePricing();`}
          </code>
          
          <p><strong>3. Access data:</strong></p>
          <code className="block bg-gray-100 p-2 rounded">
            {`if (loading) return <div>Loading...</div>;`}<br/>
            {`return <div>Pricing: {pricing?.slotBookingFee}</div>;`}
          </code>
        </div>
      </div>
    </div>
  );
}
