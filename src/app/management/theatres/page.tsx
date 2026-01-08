'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Settings } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import ConfirmationModal from '@/components/ConfirmationModal';

interface Theater {
  _id?: string;
  theaterId?: string;
  name: string;
  price: number;
  capacity: {
    min: number;
    max: number;
  };
  image: string;
  whatsIncluded: string[];
  isActive?: boolean;
}

export default function TheatresPage() {
  const { showSuccess, showError, toasts, removeToast } = useToast();
  const [theatres, setTheatres] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [editingTheater, setEditingTheater] = useState<Theater | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Theater>({
    name: '',
    price: 0,
    capacity: { min: 0, max: 0 },
    image: '',
    whatsIncluded: []
  });
  const [includedItem, setIncludedItem] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [viewingIncludes, setViewingIncludes] = useState<string[] | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // For confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [theaterToDelete, setTheaterToDelete] = useState<string | null>(null);

  // Fetch theaters from database
  useEffect(() => {
    fetchTheaters();
  }, []);

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTheaters = async () => {
    try {
      const response = await fetch('/api/admin/theaters');
      const data = await response.json();
      
      if (data.success) {
        setTheatres(data.theaters || []);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const handleAddTheater = () => {
    setFormData({
      name: '',
      price: 0,
      capacity: { min: 0, max: 0 },
      image: '',
      whatsIncluded: []
    });
    setImagePreview('');
    setSelectedImageFile(null);
    setEditingTheater(null);
    setShowAddPopup(true);
  };

  const handleEditTheater = (theater: Theater) => {
    setFormData({
      name: theater.name,
      price: theater.price,
      capacity: theater.capacity,
      image: theater.image,
      whatsIncluded: theater.whatsIncluded || []
    });
    setImagePreview(theater.image || '');
    setEditingTheater(theater);
    setShowAddPopup(true);
  };

  const handleSaveTheater = async () => {
    try {
      setUploadingImage(true);
      
      let imageUrl = formData.image;

      // Upload image to Cloudinary if a new image is selected
      if (selectedImageFile) {
        const uploadedUrl = await uploadImageToCloudinary(selectedImageFile);
        if (!uploadedUrl) {
          showError('Failed to upload image to Cloudinary');
          setUploadingImage(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      // Validate required fields
      if (!formData.name || !formData.price || !imageUrl) {
        showToast('Please fill all required fields (Name, Price, Image)', 'error');
        setUploadingImage(false);
        return;
      }

      const url = editingTheater 
        ? '/api/admin/theaters' 
        : '/api/admin/theaters';
      
      const method = editingTheater ? 'PUT' : 'POST';
      
      const body = editingTheater 
        ? { ...formData, image: imageUrl, theaterId: editingTheater.theaterId }
        : { ...formData, image: imageUrl };

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        showToast(editingTheater ? 'Theater updated successfully!' : 'Theater added successfully!', 'success');
        setShowAddPopup(false);
        setSelectedImageFile(null);
        setImagePreview('');
        fetchTheaters();
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (error) {
      
      showToast('Failed to save theater', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteTheater = async (theaterId: string) => {
    setTheaterToDelete(theaterId);
    setShowConfirmModal(true);
  };

  const confirmDeleteTheater = async () => {
    if (!theaterToDelete) return;

    try {
      const response = await fetch(`/api/admin/theaters?theaterId=${theaterToDelete}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Theater deleted successfully!');
        fetchTheaters();
      } else {
        showError('Error: ' + data.error);
      }
    } catch (error) {
      
      showError('Failed to delete theater');
    } finally {
      setShowConfirmModal(false);
      setTheaterToDelete(null);
    }
  };

  const addIncludedItem = () => {
    if (includedItem.trim()) {
      setFormData({
        ...formData,
        whatsIncluded: [...formData.whatsIncluded, includedItem.trim()]
      });
      setIncludedItem('');
    }
  };

  const removeIncludedItem = (index: number) => {
    setFormData({
      ...formData,
      whatsIncluded: formData.whatsIncluded.filter((_, i) => i !== index)
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Store file for later upload
    setSelectedImageFile(file);

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToCloudinary = async (file: File): Promise<string | null> => {
    try {
      // Resolve Cloudinary cloud name from database settings
      const getCloudinaryCloudName = async (): Promise<string> => {
        try {
          const cached = sessionStorage.getItem('cloudinaryCloudName');
          if (cached) return cached;
          const res = await fetch('/api/admin/settings');
          const data = await res.json();
          const name = data?.settings?.cloudinaryCloudName || '';
          if (name) sessionStorage.setItem('cloudinaryCloudName', name);
          return name;
        } catch (e) {
          return '';
        }
      };

      const cloudName = await getCloudinaryCloudName();
      
      if (!cloudName) {
        showError('Cloudinary cloud name not configured');
        return null;
      }

      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);
      formDataToUpload.append('upload_preset', 'Feelme-Town');
      formDataToUpload.append('folder', 'feelmetown/theater');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formDataToUpload
        }
      );

      const data = await response.json();
      
      if (data.secure_url) {
        return data.secure_url;
      } else {
        
        return null;
      }
    } catch (error) {
      
      return null;
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading theaters...</div>;
  }

  return (
    <div className="theatres-page">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <div className="page-header">
        <div className="header-content">
          <h1>Theatre List</h1>
          <p>Manage all theater halls and their configurations</p>
        </div>
        <button className="add-theatre-btn" onClick={handleAddTheater}>
          <Plus size={20} />
          Add New Theatre
        </button>
      </div>

      <div className="theatres-grid">
        {theatres.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#666' }}>
            <p>No theaters found. Click "Add New Theatre" to create one.</p>
          </div>
        ) : (
          theatres.map((theatre) => (
            <div key={theatre.theaterId || theatre._id} className="theatre-card">
              <div className="theatre-image-wrapper">
                <img src={theatre.image || '/images/theater1.webp'} alt={theatre.name} className="theatre-img" />
              </div>
            
              <div className="theatre-content">
                <h3 className="theatre-title">{theatre.name}</h3>
                <div className="theatre-price">₹{theatre.price.toLocaleString()}</div>
                
                <div className="capacity-info">
                  {theatre.capacity.min === theatre.capacity.max ? (
                    <span className="capacity-text">For {theatre.capacity.min} or Less People</span>
                  ) : (
                    <div className="capacity-multi">
                      <span className="capacity-text">For {theatre.capacity.min} or Less People</span>
                      <span className="capacity-expandable">Expandable upto {theatre.capacity.max} People</span>
                    </div>
                  )}
                </div>
              
                <div className="whats-included-section">
                  <div className="included-header">
                    <span className="included-label">What&apos;s Included:</span>
                    {theatre.whatsIncluded && theatre.whatsIncluded.length > 0 && (
                      <button 
                        className="view-full-btn" 
                        onClick={() => setViewingIncludes(theatre.whatsIncluded)}
                      >
                        View Full
                      </button>
                    )}
                  </div>
                  <div className="included-scroll-wrapper">
                    <div className="included-scroll">
                      {theatre.whatsIncluded && theatre.whatsIncluded.length > 0 ? (
                        <>
                          {/* First set of items */}
                          {theatre.whatsIncluded.map((item, index) => (
                            <span key={`first-${index}`} className="included-tag">
                              {item}
                            </span>
                          ))}
                          {/* Duplicate for seamless loop */}
                          {theatre.whatsIncluded.map((item, index) => (
                            <span key={`second-${index}`} className="included-tag">
                              {item}
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="no-items">None</span>
                      )}
                    </div>
                  </div>
                </div>
              
                <div className="theatre-actions">
                  <button className="action-btn edit-btn" onClick={() => handleEditTheater(theatre)}>
                    <Edit size={16} />
                    Edit
                  </button>
                  <button className="action-btn delete-btn" onClick={() => handleDeleteTheater(theatre.theaterId || '')}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Full Includes Popup */}
      {viewingIncludes && (
        <div className="popup-overlay" onClick={() => setViewingIncludes(null)}>
          <div className="popup-content small-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>What&apos;s Included</h2>
              <button className="close-btn" onClick={() => setViewingIncludes(null)}>×</button>
            </div>
            <div className="popup-body">
              <div className="full-includes-list">
                {viewingIncludes.map((item, index) => (
                  <div key={index} className="include-item">
                    <span className="item-number">{index + 1}.</span>
                    <span className="item-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Theater Popup */}
      {showAddPopup && (
        <div className="popup-overlay" onClick={() => setShowAddPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>{editingTheater ? 'Edit Theater' : 'Add New Theater'}</h2>
              <button className="close-btn" onClick={() => setShowAddPopup(false)}>×</button>
            </div>
            
            <div className="popup-body">
              <div className="form-group">
                <label>Theater Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter theater name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Price (₹) *</label>
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  placeholder="Enter price"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Min Capacity *</label>
                  <input
                    type="number"
                    value={formData.capacity.min || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      capacity: { ...formData.capacity, min: Number(e.target.value) }
                    })}
                    placeholder="Min people"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Max Capacity *</label>
                  <input
                    type="number"
                    value={formData.capacity.max || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      capacity: { ...formData.capacity, max: Number(e.target.value) }
                    })}
                    placeholder="Max people"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Theater Image *</label>
                <div className="image-upload-section">
                  {!imagePreview ? (
                    <label htmlFor="theater-image" className="image-upload-area">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="image-input"
                        id="theater-image"
                      />
                      <div className="upload-placeholder">
                        <svg className="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p className="upload-text">Click to upload theater image</p>
                        <p className="upload-hint">or drag and drop</p>
                        <p className="upload-format">PNG, JPG, WEBP up to 10MB</p>
                      </div>
                    </label>
                  ) : (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="preview-image" />
                      <button 
                        type="button" 
                        className="remove-image-btn"
                        onClick={() => {
                          setImagePreview('');
                          setSelectedImageFile(null);
                          setFormData({ ...formData, image: '' });
                        }}
                      >
                        ×
                      </button>
                      <p className="preview-label">Theater Image Preview</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>What&apos;s Included</label>
                <div className="included-items-input">
                  <input
                    type="text"
                    value={includedItem}
                    onChange={(e) => setIncludedItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIncludedItem())}
                    placeholder="Add item (e.g., AC, Projector)"
                    className="form-input"
                  />
                  <button type="button" onClick={addIncludedItem} className="add-item-btn">Add</button>
                </div>
                <div className="included-items-list">
                  {formData.whatsIncluded.map((item, index) => (
                    <div key={index} className="included-item">
                      <span>{item}</span>
                      <button onClick={() => removeIncludedItem(index)} className="remove-item-btn">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="popup-footer">
              <button onClick={() => setShowAddPopup(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleSaveTheater} className="btn-save">
                {editingTheater ? 'Update Theater' : 'Add Theater'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .theatres-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
        }

        /* Toast Notification Styles */
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 99999;
          animation: slideIn 0.3s ease-out, slideOut 0.3s ease-in 2.7s;
          min-width: 300px;
          max-width: 500px;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        .toast-success .toast-content {
          background: #28a745;
          color: white;
        }

        .toast-error .toast-content {
          background: #dc3545;
          color: white;
        }

        .toast-icon {
          font-size: 20px;
          font-weight: bold;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
        }

        .toast-message {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
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

        .add-theatre-btn {
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

        .add-theatre-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .theatres-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .theatre-card {
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .theatre-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .theatre-image-wrapper {
          padding: 1rem;
          background: #f8f9fa;
        }

        .theatre-img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 18px;
        }

        .theatre-content {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .theatre-title {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 0.5rem 0;
        }

        .theatre-price {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--accent-color);
          margin-bottom: 1rem;
        }

        .capacity-info {
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .capacity-text {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #333;
          font-weight: 600;
          display: block;
        }

        .capacity-multi {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .capacity-expandable {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          color: #666;
          font-weight: 500;
        }

        .whats-included-section {
          margin-bottom: 1.5rem;
          flex: 1;
        }

        .included-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .included-label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #666;
          font-weight: 500;
        }

        .view-full-btn {
          background: #dc3545;
          border: none;
          color: white;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .view-full-btn:hover {
          background: #c82333;
          transform: translateY(-1px);
        }

        .included-scroll-wrapper {
          overflow: hidden;
          position: relative;
        }

        .included-scroll-wrapper::before,
        .included-scroll-wrapper::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 60px;
          pointer-events: none;
          z-index: 2;
        }

        .included-scroll-wrapper::before {
          left: 0;
          background: linear-gradient(to right, white, transparent);
        }

        .included-scroll-wrapper::after {
          right: 0;
          background: linear-gradient(to left, white, transparent);
        }

        .included-scroll {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem 0;
          animation: scroll-left 20s linear infinite;
          width: max-content;
        }

        .included-scroll:hover {
          animation-play-state: paused;
        }

        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .included-tag {
          background: #e9ecef;
          color: #495057;
          padding: 0.4rem 0.8rem;
          border-radius: 16px;
          font-size: 0.8rem;
          font-weight: 500;
          white-space: nowrap;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        .no-items {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          color: #999;
        }

        .theatre-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .view-btn {
          background: #007bff;
          color: white;
        }

        .view-btn:hover {
          background: #0056b3;
        }

        .edit-btn {
          background: #28a745;
          color: white;
        }

        .edit-btn:hover {
          background: #1e7e34;
        }

        .settings-btn {
          background: #6c757d;
          color: white;
        }

        .settings-btn:hover {
          background: #545b62;
        }

        .delete-btn {
          background: #dc3545;
          color: white;
        }

        .delete-btn:hover {
          background: #c82333;
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
          width: 30px;
          height: 30px;
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
          transition: border-color 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .form-input::placeholder {
          color: #999;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .included-items-input {
          display: flex;
          gap: 0.5rem;
        }

        .add-item-btn {
          padding: 0.75rem 1.5rem;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          cursor: pointer;
          white-space: nowrap;
        }

        .add-item-btn:hover {
          background: var(--accent-hover);
        }

        .included-items-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .included-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #e9ecef;
          padding: 0.5rem 0.75rem;
          border-radius: 20px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
        }

        .remove-item-btn {
          background: none;
          border: none;
          color: #dc3545;
          font-size: 1.2rem;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          width: 20px;
          height: 20px;
        }

        /* Image Upload Styles */
        .image-upload-section {
          margin-top: 0.5rem;
        }

        .image-input {
          display: none;
        }

        .image-upload-area {
          display: block;
          border: 2px dashed #cbd5e0;
          border-radius: 12px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f8f9fa;
        }

        .image-upload-area:hover {
          border-color: var(--accent-color);
          background: #f0f4f8;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .upload-icon {
          color: #718096;
          margin-bottom: 0.5rem;
        }

        .upload-text {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 500;
          color: #2d3748;
          margin: 0;
        }

        .upload-hint {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.875rem;
          color: #718096;
          margin: 0;
        }

        .upload-format {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.75rem;
          color: #a0aec0;
          margin: 0.5rem 0 0 0;
        }

        .image-preview-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
          background: #f8f9fa;
          padding: 1rem;
        }

        .preview-image {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 8px;
          max-height: 400px;
          object-fit: contain;
        }

        .preview-label {
          text-align: center;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.875rem;
          color: #718096;
          margin: 0.75rem 0 0 0;
        }

        .remove-image-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: rgba(220, 53, 69, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          font-size: 1.5rem;
          cursor: pointer;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .remove-image-btn:hover {
          background: #dc3545;
          transform: scale(1.1);
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

        /* View Full Includes Popup */
        .small-popup {
          max-width: 500px;
        }

        .full-includes-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .include-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid var(--accent-color);
        }

        .item-number {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent-color);
          min-width: 24px;
        }

        .item-text {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #333;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .theatres-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .theatres-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .theatre-actions {
            justify-content: center;
          }

          .popup-content {
            width: 95%;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Delete Theater"
        message="Are you sure you want to delete this theater?"
        confirmText="Yes, Delete"
        cancelText="No, Keep"
        onConfirm={confirmDeleteTheater}
        onCancel={() => {
          setShowConfirmModal(false);
          setTheaterToDelete(null);
        }}
        type="danger"
      />
    </div>
  );
}
