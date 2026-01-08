'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';

interface PricingData {
  slotBookingFee: number;
  extraGuestFee: number;
  convenienceFee: number;
  decorationFees: number;
}

const PricingManagement: React.FC = () => {
  const [pricing, setPricing] = useState<PricingData>({
    slotBookingFee: 0,
    extraGuestFee: 0,
    convenienceFee: 0,
    decorationFees: 0
  });
  const [pricingId, setPricingId] = useState<string | null>(null); // Store pricing ID for updates
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError, toasts, removeToast } = useToast();

  useEffect(() => {
    loadPricingFromDatabase();
  }, []);

  const loadPricingFromDatabase = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading pricing from database...');
      
      const response = await fetch(`/api/admin/pricing?cache=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json();
      console.log('📊 Pricing API response:', data);
      
      if (data.success && data.pricing && data.pricing.length > 0) {
        // Use the first pricing configuration
        const firstPricing = data.pricing[0];
        console.log('✅ Setting pricing data:', firstPricing);
        setPricing({
          slotBookingFee: firstPricing.slotBookingFee || 0,
          extraGuestFee: firstPricing.extraGuestFee || 0,
          convenienceFee: firstPricing.convenienceFee || 0,
          decorationFees: firstPricing.decorationFees || 0
        });
        // Store the pricing ID for updates
        setPricingId(firstPricing._id || firstPricing.id || null);
        console.log('✅ Stored pricing ID:', firstPricing._id || firstPricing.id);
      } else {
        console.log('⚠️ No pricing data in database - using defaults');
        setPricingId(null); // No existing pricing
      }
    } catch (error) {
      console.error('❌ Error loading pricing:', error);
      showError('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving pricing to database:', pricing);
      console.log('💾 Pricing ID:', pricingId);

      // Use PUT if pricing exists, POST if creating new
      const method = pricingId ? 'PUT' : 'POST';
      const body = pricingId 
        ? {
            id: pricingId,
            ...pricing
          }
        : {
            name: 'Standard Pricing',
            description: 'Default pricing configuration',
            ...pricing,
            isActive: true
          };

      console.log(`💾 Using ${method} method with body:`, body);

      const response = await fetch('/api/admin/pricing', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('💾 Save response:', data);
      
      if (data.success) {
        showSuccess(pricingId ? 'Pricing updated successfully!' : 'Pricing created successfully!');
        console.log('✅ Pricing saved successfully');
        loadPricingFromDatabase();
      } else {
        console.error('❌ Save failed:', data.error);
        showError('Failed to save pricing: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      showError('Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof PricingData, value: string) => {
    console.log(`💰 Input change - ${field}: ${value}`);
    
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setPricing(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  if (loading) {
    return (
      <div className="pricing-container">
        <div className="pricing-header">
          <div className="header-content">
            <h1>Pricing Management</h1>
            <p>Manage booking fees and charges</p>
          </div>
        </div>
        <div className="loading">Loading pricing data...</div>
      </div>
    );
  }

  return (
    <div className="pricing-container">
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      
      <div className="pricing-header">
        <div className="header-content">
          <h1>Pricing Management</h1>
          <p>Manage booking fees and charges for the booking system</p>
        </div>
      </div>

      <div className="pricing-content">
        <div className="pricing-card">
          <div className="pricing-card-header">
            <h2>Booking Fees</h2>
            <p>Configure the fees charged for different booking services</p>
          </div>

          <div className="pricing-form">
            <div className="pricing-field">
              <label htmlFor="slotBookingFee">Slot Booking Fee (₹)</label>
              <input
                id="slotBookingFee"
                type="number"
                value={pricing.slotBookingFee}
                onChange={(e) => handleInputChange('slotBookingFee', e.target.value)}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                }}
                inputMode="numeric"
                placeholder="Enter slot booking fee"
              />
              <p className="field-description">
                Base fee charged for booking a theater slot
              </p>
            </div>

            <div className="pricing-field">
              <label htmlFor="extraGuestFee">Extra Guest Fee (₹)</label>
              <input
                id="extraGuestFee"
                type="number"
                value={pricing.extraGuestFee}
                onChange={(e) => handleInputChange('extraGuestFee', e.target.value)}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                }}
                inputMode="numeric"
                placeholder="Enter extra guest fee"
              />
              <p className="field-description">
                Additional fee per guest beyond theater minimum capacity
              </p>
            </div>

            <div className="pricing-field">
              <label htmlFor="convenienceFee">Convenience Fee (₹)</label>
              <input
                id="convenienceFee"
                type="number"
                value={pricing.convenienceFee}
                onChange={(e) => handleInputChange('convenienceFee', e.target.value)}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                }}
                inputMode="numeric"
                placeholder="Enter convenience fee"
              />
              <p className="field-description">
                Processing fee for online bookings
              </p>
            </div>

            <div className="pricing-field">
              <label htmlFor="decorationFees">Decoration Fees (₹)</label>
              <input
                id="decorationFees"
                type="number"
                value={pricing.decorationFees}
                onChange={(e) => handleInputChange('decorationFees', e.target.value)}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                }}
                inputMode="numeric"
                placeholder="Enter decoration fees"
              />
              <p className="field-description">
                Additional fees for decoration services
              </p>
            </div>
          </div>

          <div className="pricing-actions">
            <button
              onClick={handleSave}
              disabled={saving}
              className="save-button"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                console.log('🔄 Manual refresh clicked');
                loadPricingFromDatabase();
              }}
              disabled={loading}
              className="refresh-button"
              style={{ marginLeft: '1rem' }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="pricing-preview">
          <h3>Current Pricing Summary</h3>
          <div className="pricing-summary">
            <div className="summary-item">
              <span className="label">Slot Booking Fee:</span>
              <span className="value" style={{color: pricing.slotBookingFee > 0 ? 'var(--accent-color)' : '#999'}}>
                ₹{pricing.slotBookingFee}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Extra Guest Fee:</span>
              <span className="value" style={{color: pricing.extraGuestFee > 0 ? 'var(--accent-color)' : '#999'}}>
                ₹{pricing.extraGuestFee} per guest
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Convenience Fee:</span>
              <span className="value" style={{color: pricing.convenienceFee > 0 ? 'var(--accent-color)' : '#999'}}>
                ₹{pricing.convenienceFee}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Decoration Fees:</span>
              <span className="value" style={{color: pricing.decorationFees > 0 ? 'var(--accent-color)' : '#999'}}>
                ₹{pricing.decorationFees}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pricing-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .pricing-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .header-content h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          font-weight: 600;
          color: #000;
          margin: 0 0 0.5rem 0;
        }

        .header-content p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #000;
          margin: 0;
        }

        .loading {
          text-align: center;
          color: #000;
          font-size: 1.2rem;
          margin-top: 4rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        .pricing-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        .pricing-card {
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .pricing-card-header {
          padding: 2rem 2rem 1rem 2rem;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }

        .pricing-card-header h2 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .pricing-card-header p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          color: #666;
          font-size: 0.95rem;
          margin: 0;
        }

        .pricing-form {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .pricing-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .pricing-field label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-weight: 500;
          color: #000;
          font-size: 0.95rem;
        }

        .pricing-field input,
        .pricing-field textarea {
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          transition: all 0.3s ease;
          background: white;
          color: #000;
          width: 100%;
          box-sizing: border-box;
        }

        .pricing-field textarea {
          resize: vertical;
          min-height: 80px;
        }

        /* Hide number input spinners (Chrome, Safari, Edge) */
        .pricing-field input[type='number']::-webkit-outer-spin-button,
        .pricing-field input[type='number']::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        /* Hide number input spinners (Firefox) */
        .pricing-field input[type='number'] {
          -moz-appearance: textfield;
        }

        .pricing-field input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .field-description {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          color: #000;
          margin: 0;
          line-height: 1.4;
        }

        .pricing-actions {
          padding: 1.5rem 2rem 2rem 2rem;
          display: flex;
          justify-content: flex-end;
        }

        .save-button {
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.875rem 2rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .save-button:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .refresh-button {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.875rem 2rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .refresh-button:hover:not(:disabled) {
          background: #218838;
          transform: translateY(-1px);
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .cancel-button {
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.875rem 2rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .cancel-button:hover:not(:disabled) {
          background: #5a6268;
          transform: translateY(-1px);
        }

        .cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .pricing-list {
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          margin-top: 2rem;
        }

        .pricing-list h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 1.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #666;
        }

        .empty-state p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1.1rem;
        }

        .pricing-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pricing-item {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          background: #f8f9fa;
        }

        .pricing-item:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .pricing-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .pricing-item-header h4 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.2rem;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .pricing-item-actions {
          display: flex;
          gap: 0.5rem;
        }

        .edit-button {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-button:hover {
          background: #218838;
          transform: translateY(-1px);
        }

        .delete-button {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .delete-button:hover {
          background: #c82333;
          transform: translateY(-1px);
        }

        .pricing-description {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          font-style: italic;
        }

        .pricing-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .pricing-detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 0.75rem;
          border-radius: 6px;
          border-left: 3px solid var(--accent-color);
        }

        .pricing-detail .label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-weight: 500;
          color: #374151;
          font-size: 0.85rem;
        }

        .pricing-detail .value {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-weight: 600;
          color: var(--accent-color);
          font-size: 0.9rem;
        }

        .pricing-status {
          display: flex;
          justify-content: flex-end;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .pricing-preview {
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.3s ease;
          height: fit-content;
        }

        .pricing-preview:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .pricing-preview h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 1.5rem;
          text-align: center;
          padding: 2rem 2rem 0 2rem;
        }

        .pricing-summary {
          padding: 0 2rem 2rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid var(--accent-color);
          transition: all 0.3s ease;
        }

        .summary-item:hover {
          background: #e9ecef;
          transform: translateX(4px);
        }

        .summary-item .label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-weight: 500;
          color: #374151;
          font-size: 0.9rem;
        }

        .summary-item .value {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-weight: 600;
          color: var(--accent-color);
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .pricing-container {
            padding: 1rem;
          }

          .pricing-content {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .pricing-header h1 {
            font-size: 1.8rem;
          }

          .pricing-card,
          .pricing-preview {
            margin: 0;
          }

          .pricing-card-header,
          .pricing-form,
          .pricing-actions {
            padding: 1.5rem;
          }

          .pricing-preview h3 {
            padding: 1.5rem 1.5rem 0 1.5rem;
          }

          .pricing-summary {
            padding: 0 1.5rem 1.5rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PricingManagement;
