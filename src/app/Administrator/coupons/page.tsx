'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Download } from 'lucide-react';
import GlobalDatePicker from '@/components/GlobalDatePicker';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import ConfirmationModal from '@/components/ConfirmationModal';

interface Coupon {
  _id?: string;
  couponCode: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  usageLimit: number | null;
  validDate: string | Date;
  expireDate: string | Date | null;
  isActive: boolean;
  createdAt?: Date;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const [showValidDatePicker, setShowValidDatePicker] = useState(false);
  const [showExpireDatePicker, setShowExpireDatePicker] = useState(false);
  
  // For confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Coupon>({
    couponCode: '',
    discountType: 'percentage',
    discountValue: 0,
    usageLimit: null,
    validDate: '',
    expireDate: null,
    isActive: true
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const downloadCouponAsImage = async (couponCode: string) => {
    try {
      const couponElement = document.getElementById(`coupon-${couponCode}`);
      if (!couponElement) return;

      // Use html2canvas library
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(couponElement, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      });

      // Convert to image and download
      const link = document.createElement('a');
      link.download = `${couponCode}-coupon.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showSuccess('Coupon downloaded successfully!');
    } catch (error) {
      
      showError('Failed to download coupon');
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/admin/coupons');
      const data = await response.json();
      
      if (data.success) {
        setCoupons(data.coupons || []);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoupon = () => {
    setFormData({
      couponCode: '',
      discountType: 'percentage',
      discountValue: 0,
      usageLimit: null,
      validDate: '',
      expireDate: null,
      isActive: true
    });
    setEditingCoupon(null);
    setShowAddPopup(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setFormData({
      couponCode: coupon.couponCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      usageLimit: coupon.usageLimit,
      validDate: coupon.validDate,
      expireDate: coupon.expireDate,
      isActive: coupon.isActive
    });
    setEditingCoupon(coupon);
    setShowAddPopup(true);
  };

  const handleSaveCoupon = async () => {
    try {
      // Validation
      if (!formData.couponCode || !formData.discountValue || !formData.validDate) {
        showError('Please fill all required fields');
        return;
      }

      const url = '/api/admin/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';
      
      const body = editingCoupon 
        ? { ...formData, couponCode: editingCoupon.couponCode }
        : formData;

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(editingCoupon ? 'Coupon updated successfully!' : 'Coupon created successfully!');
        setShowAddPopup(false);
        fetchCoupons();
      } else {
        showError('Error: ' + data.error);
      }
    } catch (error) {
      
      showError('Failed to save coupon');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: coupon.couponCode,
          isActive: !coupon.isActive
        })
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'} successfully!`);
        fetchCoupons();
      } else {
        showError('Error: ' + data.error);
      }
    } catch (error) {
      
      showError('Failed to toggle coupon');
    }
  };

  const handleDeleteCoupon = async (couponCode: string) => {
    setCouponToDelete(couponCode);
    setShowConfirmModal(true);
  };

  const confirmDeleteCoupon = async () => {
    if (!couponToDelete) return;

    try {
      const response = await fetch(`/api/admin/coupons?couponCode=${couponToDelete}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Coupon deactivated successfully!');
        fetchCoupons();
      } else {
        showError('Error: ' + data.error);
      }
    } catch (error) {
      
      showError('Failed to delete coupon');
    } finally {
      setShowConfirmModal(false);
      setCouponToDelete(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading coupons...</div>;
  }

  return (
    <div className="coupons-page">
      {/* Toasts are now handled by global ToastContainer */}

      <div className="page-header">
        <div className="header-content">
          <h1>Coupons Management</h1>
          <p>Create and manage discount coupons</p>
        </div>
        <button className="add-coupon-btn" onClick={handleAddCoupon}>
          <Plus size={20} />
          Add New Coupon
        </button>
      </div>

      <div className="coupons-table">
        <table>
          <thead>
            <tr>
              <th>Coupon Code</th>
              <th>Discount</th>
              <th>Usage Limit</th>
              <th>Valid Date</th>
              <th>Expire Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  No coupons found. Click &quot;Add New Coupon&quot; to create one.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.couponCode}>
                  <td className="coupon-code">{coupon.couponCode}</td>
                  <td>
                    {coupon.discountType === 'percentage' 
                      ? `${coupon.discountValue}%` 
                      : `₹${coupon.discountValue}`
                    }
                  </td>
                  <td>{coupon.usageLimit || 'Unlimited'}</td>
                  <td>{new Date(coupon.validDate).toLocaleDateString()}</td>
                  <td>{coupon.expireDate ? new Date(coupon.expireDate).toLocaleDateString() : 'No Expiry'}</td>
                  <td>
                    <span className={`status-badge ${coupon.isActive ? 'active' : 'inactive'}`}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className={`toggle-switch ${coupon.isActive ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(coupon)}
                        title={coupon.isActive ? 'Click to Deactivate' : 'Click to Activate'}
                      >
                        <div className="toggle-slider">
                          <div className="toggle-circle"></div>
                        </div>
                        <span className="toggle-label">
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                      <button className="action-btn edit-btn" onClick={() => handleEditCoupon(coupon)}>
                        <Edit size={16} />
                        <span>Edit</span>
                      </button>
                      <button className="action-btn delete-btn" onClick={() => handleDeleteCoupon(coupon.couponCode)}>
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Coupon Cards Display */}
      <div className="coupons-cards-section">
        <h2 className="section-title">Active Coupons Preview</h2>
        <div className="coupons-cards-grid">
          {coupons.filter(c => c.isActive).map((coupon) => (
            <div key={coupon.couponCode} className="coupon-card-wrapper">
              <button 
                className="download-coupon-btn" 
                onClick={() => downloadCouponAsImage(coupon.couponCode)}
                title="Download Coupon"
              >
                <Download size={20} />
              </button>
              <div className="coupon-card" id={`coupon-${coupon.couponCode}`}>
                <div className="coupon-left">
                  <div className="brand-text">FeelMe Town</div>
                  <div className="coupon-description">
                    Premium Private Theater Experience with Amazing Discounts
                  </div>
                  <img src="/images/barcode.svg" alt="Barcode" className="coupon-barcode" />
                  <div className="scissors-divider">
                    <div className="scissors-icon">✂</div>
                  </div>
                </div>
                <div className="coupon-right">
                  <div className="coupon-validity">
                    Valid upto: {coupon.expireDate ? new Date(coupon.expireDate).toLocaleDateString() : 'No Expiry'}
                  </div>
                  <div className="discount-text">
                    {coupon.discountType === 'percentage' 
                      ? `${coupon.discountValue}%` 
                      : `₹${coupon.discountValue}`
                    }
                  </div>
                  <div className="coupon-label">COUPON</div>
                  <div className="coupon-details-right">
                    <div className="coupon-code-display">{coupon.couponCode}</div>
                  </div>
                  <div className="gift-icon">🎁</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Coupon Popup */}
      {showAddPopup && (
        <div className="popup-overlay" onClick={() => setShowAddPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>{editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}</h2>
              <button className="close-btn" onClick={() => setShowAddPopup(false)}>×</button>
            </div>
            
            <div className="popup-body">
              <div className="form-group">
                <label>Coupon Code *</label>
                <input
                  type="text"
                  value={formData.couponCode}
                  onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  className="form-input"
                  disabled={!!editingCoupon}
                />
              </div>

              <div className="form-group">
                <label>Discount Type *</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                  className="form-input"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Discount Value *</label>
                <input
                  type="number"
                  value={formData.discountValue || ''}
                  onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                  placeholder={formData.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 500'}
                  className="form-input"
                />
                <small className="form-hint">
                  {formData.discountType === 'percentage' 
                    ? 'Enter percentage (e.g., 20 for 20% off)' 
                    : 'Enter amount in rupees (e.g., 500 for ₹500 off)'
                  }
                </small>
              </div>

              <div className="form-group">
                <label>Usage Limit</label>
                <input
                  type="number"
                  value={formData.usageLimit || ''}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Leave empty for unlimited"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valid From *</label>
                  <input
                    type="text"
                    value={formData.validDate ? String(formData.validDate) : ''}
                    onClick={() => setShowValidDatePicker(true)}
                    placeholder="Click to select date"
                    className="form-input date-input"
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Expire Date</label>
                  <input
                    type="text"
                    value={formData.expireDate ? String(formData.expireDate) : ''}
                    onClick={() => setShowExpireDatePicker(true)}
                    placeholder="Click to select date"
                    className="form-input date-input"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="popup-footer">
              <button onClick={() => setShowAddPopup(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleSaveCoupon} className="btn-save">
                {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Date Pickers */}
      <GlobalDatePicker
        isOpen={showValidDatePicker}
        onClose={() => setShowValidDatePicker(false)}
        onDateSelect={(date) => {
          setFormData({ ...formData, validDate: date });
          setShowValidDatePicker(false);
        }}
        selectedDate={formData.validDate as string || ''}
      />

      <GlobalDatePicker
        isOpen={showExpireDatePicker}
        onClose={() => setShowExpireDatePicker(false)}
        onDateSelect={(date) => {
          setFormData({ ...formData, expireDate: date });
          setShowExpireDatePicker(false);
        }}
        selectedDate={formData.expireDate as string || ''}
      />

      <style jsx>{`
        .coupons-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .header-content h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 0.5rem 0;
        }

        .header-content p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #666;
          margin: 0;
        }

        .add-coupon-btn {
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .add-coupon-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .coupons-table {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: #f8f9fa;
        }

        th {
          padding: 1rem;
          text-align: left;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #dee2e6;
        }

        td {
          padding: 1rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #666;
          border-bottom: 1px solid #f1f3f5;
        }

        tr:hover {
          background: #f8f9fa;
        }

        .coupon-code {
          font-family: 'Hacked-CRT', monospace;
          font-weight: 700;
          color: var(--accent-color);
          font-size: 1rem;
        }

        .status-badge {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
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

        .action-buttons {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        /* Modern Toggle Switch */
        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .toggle-switch.active {
          background: #d4edda;
          color: #155724;
        }

        .toggle-switch.inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .toggle-switch:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .toggle-slider {
          position: relative;
          width: 40px;
          height: 20px;
          border-radius: 10px;
          transition: all 0.3s ease;
        }

        .toggle-switch.active .toggle-slider {
          background: #28a745;
        }

        .toggle-switch.inactive .toggle-slider {
          background: #dc3545;
        }

        .toggle-circle {
          position: absolute;
          top: 2px;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch.active .toggle-circle {
          left: 22px;
        }

        .toggle-switch.inactive .toggle-circle {
          left: 2px;
        }

        .toggle-label {
          font-weight: 600;
        }

        .action-btn {
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .edit-btn {
          background: #28a745;
          color: white;
        }

        .edit-btn:hover {
          background: #1e7e34;
          transform: translateY(-1px);
        }

        .delete-btn {
          background: #dc3545;
          color: white;
        }

        .delete-btn:hover {
          background: #c82333;
          transform: translateY(-1px);
        }

        /* Coupon Cards Section */
        .coupons-cards-section {
          margin-top: 3rem;
        }

        .section-title {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 1.5rem 0;
        }

        .coupons-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
          gap: 2rem;
        }

        .coupon-card-wrapper {
          width: 100%;
          height: 180px;
          position: relative;
        }

        .download-coupon-btn {
          position: absolute;
          top: -10px;
          right: -10px;
          z-index: 20;
          background: var(--accent-color);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .download-coupon-btn:hover {
          background: #c41e3a;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .download-coupon-btn:active {
          transform: scale(0.95);
        }

        .coupon-card {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }

        .coupon-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        }

        .coupon-left {
          width: 30%;
          background: #FBBB26;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0;
          border-radius: 24px 0 0 24px;
          border-right: 2px dashed rgba(255, 255, 255, 0.5);
        }

        .brand-text {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.8);
          text-align: center;
          letter-spacing: 1px;
          margin-bottom: 0.5rem;
        }

        .coupon-description {
          font-size: 0.65rem;
          color: rgba(0, 0, 0, 0.85);
          margin-bottom: 1rem;
          text-align: center;
          line-height: 1.3;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          padding: 0 0.5rem;
        }

        .coupon-barcode {
          display: block;
          width: 140px;
          height: auto;
          margin: 0 auto;
        }

        .scissors-divider {
          position: absolute;
          right: -22px;
          top: 60%;
          transform: translateY(50%) rotate(-90deg);
          z-index: 10;
        }

        .scissors-icon {
          font-size: 2rem;
          color: rgba(255, 255, 255, 0.9);
         
          padding: 0.5rem;
          border-radius: 50%;
          transform: rotate(0deg);
        }

        .coupon-right {
          width: 70%;
          background: #FBBB26;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          position: relative;
          border-radius: 0 24px 24px 0;
        }

        .discount-text {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 6rem;
          font-weight: 700;
          color: white;
          line-height: 1;
          margin-bottom: 0.5rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
          text-align: left;
        }

        .coupon-label {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.8rem;
          font-weight: 700;
          color: white;
          line-height: 1;
          margin-bottom: 0.75rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
          text-align: left;
        }

        .coupon-details-right {
          position: absolute;
          right: 1.5rem;
          top: 50%;
          transform: translateY(-50%);
          text-align: right;
        }

        .coupon-code-display {
          position: absolute;
          bottom: -5rem;
          right: 0rem;
          font-family: 'Hacked-CRT', monospace;
          font-size: 2rem;
          font-weight: 700;
          color: rgba(0, 0, 0, 0.95);
          letter-spacing: 2px;
        }

        .coupon-validity {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: rgba(255, 255, 255);
          font-weight: 500;
        }

        .gift-icon {
          position: absolute;
          bottom: 1rem;
          right: 1.5rem;
          font-size: 3rem;
          opacity: 0.25;
        }

        /* Popup Styles */
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        .popup-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .popup-header h2 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          color: #999;
          cursor: pointer;
          line-height: 1;
          padding: 0;
        }

        .close-btn:hover {
          color: #333;
        }

        .popup-body {
          padding: 1.5rem;
          color: #000;
        }

        .popup-body * {
          color: #000;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: #000 !important;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          background: white;
          color: #000;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .form-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .date-input {
          cursor: pointer;
        }

        .date-input:hover {
          border-color: var(--accent-color);
        }

        .form-hint {
          display: block;
          font-size: 0.8rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: var(--accent-color);
        }

        .checkbox-label span {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #333;
        }

        .popup-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1.5rem;
          border-top: 1px solid #eee;
        }

        .btn-cancel, .btn-save {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-cancel {
          background: #f8f9fa;
          color: #333;
        }

        .btn-cancel:hover {
          background: #e9ecef;
        }

        .btn-save {
          background: var(--accent-color);
          color: white;
        }

        .btn-save:hover {
          background: var(--accent-hover);
        }

        @media (max-width: 768px) {
          .coupons-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .coupons-table {
            overflow-x: auto;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .popup-content {
            width: 95%;
          }
        }
      `}</style>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Deactivate Coupon"
        message="Are you sure you want to deactivate this coupon?"
        confirmText="Yes, Deactivate"
        cancelText="No, Keep"
        onConfirm={confirmDeleteCoupon}
        onCancel={() => {
          setShowConfirmModal(false);
          setCouponToDelete(null);
        }}
        type="warning"
      />
    </div>
  );
}

