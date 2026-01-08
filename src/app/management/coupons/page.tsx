'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const downloadCouponAsImage = async (couponCode: string) => {
    try {
      const couponElement = document.getElementById(`coupon-${couponCode}`);
      if (!couponElement) return;

      // Use html2canvas library
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(couponElement, {
        scale: 2,
        backgroundColor: null,
      });

      // Convert to image and download
      const link = document.createElement('a');
      link.download = `${couponCode}-coupon.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast('Coupon image downloaded successfully!', 'success');
    } catch (error) {
      
      showToast('Error downloading coupon image', 'error');
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/coupons');
      const data = await response.json();
      
      if (data.success) {
        setCoupons(data.coupons);
      } else {
        showToast('Failed to fetch coupons', 'error');
      }
    } catch (error) {
      
      showToast('Failed to fetch coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading coupons...</div>;
  }

  return (
    <div className="coupons-page">
      {toast && (
        <div className={`toast ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="header-content">
          <h1>Coupons View</h1>
          <p>View all available discount coupons</p>
        </div>
      </div>

      <div className="coupons-table">
        <table>
          <thead>
            <tr>
              <th>Coupon Code</th>
              <th>Discount</th>
              <th>Usage Limit</th>
              <th>Valid From</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  No coupons found.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.couponCode}>
                  <td className="coupon-code">{coupon.couponCode}</td>
                  <td>
                    {coupon.discountType === 'percentage' 
                      ? `${coupon.discountValue}% OFF`
                      : `₹${coupon.discountValue} OFF`
                    }
                  </td>
                  <td>{coupon.usageLimit ? coupon.usageLimit : 'Unlimited'}</td>
                  <td>{new Date(coupon.validDate).toLocaleDateString()}</td>
                  <td>
                    {coupon.expireDate 
                      ? new Date(coupon.expireDate).toLocaleDateString()
                      : 'No expiry'
                    }
                  </td>
                  <td>
                    <span className={`status-badge ${coupon.isActive ? 'active' : 'inactive'}`}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn view-btn" 
                        onClick={() => downloadCouponAsImage(coupon.couponCode)}
                        title="Download coupon image"
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="coupons-cards-section">
        <h2 className="section-title">Coupon Cards Preview</h2>
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
                  <div className="coupon-label">
                    {coupon.discountType === 'percentage' ? 'OFF' : 'OFF'}
                  </div>
                  <div className="coupon-code-display">
                    {coupon.couponCode}
                  </div>
                  <div className="gift-icon">🎁</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .coupons-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          background: #f8f9fa;
          min-height: 100vh;
        }

        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: slideIn 0.3s ease;
        }

        .toast.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .toast.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .page-header {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .header-content h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .header-content p {
          color: #64748b;
          font-size: 1.1rem;
          margin: 0;
        }

        .coupons-table {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 2rem;
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
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        td {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          font-family: 'Paralucent-Regular', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #374151;
        }

        .coupon-code {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-weight: 600;
          color: var(--accent-color);
          font-size: 1rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
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

        .action-buttons {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .action-btn {
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .view-btn {
          background: #007bff;
          color: white;
        }

        .view-btn:hover {
          background: #0056b3;
          transform: translateY(-1px);
        }

        .coupons-cards-section {
          margin-top: 3rem;
        }

        .section-title {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1.5rem;
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
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .download-coupon-btn:hover {
          background: var(--accent-hover);
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
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
          background: #FBBB26;
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

        @media (max-width: 768px) {
          .coupons-page {
            padding: 1rem;
          }

          .page-header {
            padding: 1.5rem;
          }

          .header-content h1 {
            font-size: 1.5rem;
          }

          .coupons-cards-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .coupon-card-wrapper {
            height: 160px;
          }

          .discount-text {
            font-size: 4rem;
          }

          .coupon-label {
            font-size: 1.2rem;
          }

          .coupon-code-display {
            font-size: 1.2rem;
            bottom: -3rem;
          }

          .coupon-validity {
            font-size: 0.8rem;
            top: 0.5rem;
            right: 0.5rem;
          }

          .gift-icon {
            font-size: 2rem;
            bottom: 0.5rem;
            right: 1rem;
          }

          .coupons-table {
            overflow-x: auto;
          }

          table {
            min-width: 600px;
          }
        }
      `}</style>
    </div>
  );
}
