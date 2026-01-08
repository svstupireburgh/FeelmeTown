'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Occasion {
  _id?: string;
  occasionId: string;
  name: string;
  imageUrl: string;
  requiredFields: string[];
  isActive: boolean;
  createdAt?: Date;
}

export default function OccasionsPage() {
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [editingOccasion, setEditingOccasion] = useState<Occasion | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; occasionId?: string; imageUrl?: string }>({ show: false });
  
  const [formData, setFormData] = useState<Occasion>({
    occasionId: '',
    name: '',
    imageUrl: '',
    requiredFields: [],
    isActive: true
  });

  const [currentFieldInput, setCurrentFieldInput] = useState('');

  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchOccasions();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOccasions = async () => {
    try {
      const response = await fetch('/api/admin/occasions');
      const data = await response.json();
      
      if (data.success) {
        setOccasions(data.occasions);
      }
    } catch (error) {
      
      showToast('Failed to fetch occasions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, imageUrl: '' });
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'FMTOccasions');
    formData.append('folder', 'feelmetown/occasions');

    const cloudName = await getCloudinaryCloudName();
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    return data.secure_url;
  };

  const handleAddOccasion = () => {
    setEditingOccasion(null);
    setFormData({
      occasionId: '',
      name: '',
      imageUrl: '',
      requiredFields: [],
      isActive: true
    });
    setCurrentFieldInput('');
    setImagePreview('');
    setSelectedImageFile(null);
    setShowAddPopup(true);
  };

  const addRequiredField = () => {
    if (!currentFieldInput.trim()) return;
    
    const updatedFields = [...formData.requiredFields, currentFieldInput.trim()];
    
    
    
    setFormData({
      ...formData,
      requiredFields: updatedFields
    });
    setCurrentFieldInput('');
  };

  const removeRequiredField = (index: number) => {
    setFormData({
      ...formData,
      requiredFields: formData.requiredFields.filter((_, i) => i !== index)
    });
  };

  const handleEditOccasion = (occasion: Occasion) => {
    setEditingOccasion(occasion);
    setFormData({
      occasionId: occasion.occasionId,
      name: occasion.name,
      imageUrl: occasion.imageUrl,
      requiredFields: occasion.requiredFields || [],
      isActive: occasion.isActive
    });
    setCurrentFieldInput('');
    setImagePreview(occasion.imageUrl);
    setSelectedImageFile(null);
    setShowAddPopup(true);
  };

  const handleSaveOccasion = async () => {
    if (!formData.name.trim()) {
      showToast('Please enter occasion name', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      let imageUrl = formData.imageUrl;

      // Upload image to Cloudinary if new image selected
      if (selectedImageFile) {
        imageUrl = await uploadImageToCloudinary(selectedImageFile);
      }

      const occasionData = {
        ...formData,
        imageUrl: imageUrl
      };

      

      const url = editingOccasion 
        ? `/api/admin/occasions?id=${editingOccasion._id}`
        : '/api/admin/occasions';
      
      const method = editingOccasion ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(occasionData)
      });

      const data = await response.json();

      if (data.success) {
        showToast(editingOccasion ? 'Occasion updated successfully!' : 'Occasion added successfully!', 'success');
        setShowAddPopup(false);
        fetchOccasions();
      } else {
        showToast(data.error || 'Failed to save occasion', 'error');
      }
    } catch (error) {
      
      showToast('Failed to save occasion', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteClick = (id: string, imageUrl: string) => {
    setDeleteConfirm({ show: true, occasionId: id, imageUrl: imageUrl });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.occasionId) return;

    try {
      const response = await fetch(`/api/admin/occasions?id=${deleteConfirm.occasionId}&imageUrl=${encodeURIComponent(deleteConfirm.imageUrl || '')}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showToast('Occasion deleted successfully!', 'success');
        fetchOccasions();
      } else {
        showToast(data.error || 'Failed to delete occasion', 'error');
      }
    } catch (error) {
      
      showToast('Failed to delete occasion', 'error');
    } finally {
      setDeleteConfirm({ show: false });
    }
  };

  if (loading) {
    return (
      <div className="occasions-page">
        <div className="loading">Loading occasions...</div>
      </div>
    );
  }

  return (
    <div className="occasions-page">
      <div className="page-header">
        <h1>Occasions Management</h1>
        <div className="header-actions">
          <div className="total-count">
            <span className="count-number">{occasions.length}</span>
            <span className="count-label">Total Occasions</span>
          </div>
          <button className="add-btn" onClick={handleAddOccasion}>
            <Plus size={20} />
            Add Occasion
          </button>
        </div>
      </div>

      <div className="occasions-grid">
        {occasions.map((occasion) => (
          <div key={occasion._id} className="occasion-card">
            <div className="occasion-image">
              <img src={occasion.imageUrl} alt={occasion.name} />
            </div>
            <div className="occasion-info">
              <h3>{occasion.name}</h3>
              {occasion.requiredFields && occasion.requiredFields.length > 0 && (
                <div className="required-fields">
                  <span className="fields-label">Required Fields:</span>
                  <div className="fields-list">
                    {occasion.requiredFields.map((field, idx) => (
                      <span key={idx} className="field-tag">{field}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="occasion-actions">
              <button className="edit-btn" onClick={() => handleEditOccasion(occasion)}>
                <Edit size={18} />
              </button>
              <button className="delete-btn" onClick={() => handleDeleteClick(occasion._id!, occasion.imageUrl)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Popup */}
      {showAddPopup && (
        <div className="popup-overlay" onClick={() => setShowAddPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>{editingOccasion ? 'Edit Occasion' : 'Add New Occasion'}</h2>
              <button className="close-btn" onClick={() => setShowAddPopup(false)}>×</button>
            </div>
            
            <div className="popup-body">
              <div className="form-group">
                <label>Occasion Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Birthday Party, Anniversary"
                />
              </div>

              <div className="form-group">
                <label>Required Fields (Names to collect)</label>
                <div className="fields-input-group">
                  <input
                    type="text"
                    className="form-input"
                    value={currentFieldInput}
                    onChange={(e) => setCurrentFieldInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequiredField())}
                    placeholder="e.g., Birthday Person Name, Partner 1 Name"
                  />
                  <button 
                    type="button" 
                    className="add-field-btn" 
                    onClick={addRequiredField}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {formData.requiredFields.length > 0 && (
                  <div className="added-fields">
                    {formData.requiredFields.map((field, index) => (
                      <div key={index} className="field-chip">
                        <span>{field}</span>
                        <button 
                          type="button" 
                          onClick={() => removeRequiredField(index)}
                          className="remove-field-btn"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Occasion Image *</label>
                {!imagePreview ? (
                  <div className="image-upload-placeholder">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                      id="occasion-image-upload"
                    />
                    <label htmlFor="occasion-image-upload" className="upload-label">
                      <div className="upload-icon">📷</div>
                      <div className="upload-text">Click to upload image</div>
                      <div className="upload-hint">Drag and drop or browse</div>
                      <div className="upload-format">PNG, JPG, WEBP (max 5MB)</div>
                    </label>
                  </div>
                ) : (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <button className="remove-image-btn" onClick={removeImage}>✕</button>
                    <div className="preview-label">Image Preview</div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowAddPopup(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleSaveOccasion}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading...' : editingOccasion ? 'Update Occasion' : 'Add Occasion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deleteConfirm.show && (
        <div className="popup-overlay" onClick={() => setDeleteConfirm({ show: false })}>
          <div className="popup-content delete-confirm-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Confirm Delete</h2>
              <button className="close-btn" onClick={() => setDeleteConfirm({ show: false })}>×</button>
            </div>
            <div className="popup-body">
              <p>Are you sure you want to delete this occasion? This action cannot be undone.</p>
            </div>
            <div className="popup-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm({ show: false })}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <style jsx>{`
        .occasions-page {
          padding: 2rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          color: #333;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .total-count {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .count-number {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2rem;
          color: white;
          font-weight: 700;
          line-height: 1;
        }

        .count-label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.95);
          white-space: nowrap;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .add-btn:hover {
          background: #c41e3a;
        }

        .occasions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        .occasion-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .occasion-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .occasion-image {
          width: 100%;
          height: 200px;
          overflow: hidden;
          padding: 1rem;
          background: white;
        }

        .occasion-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }

        .occasion-info {
          padding: 1.5rem;
        }

        .occasion-info h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.25rem;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .occasion-info p {
          font-size: 0.9rem;
          color: #666;
          line-height: 1.4;
        }

        .required-fields {
          margin-top: 0.75rem;
        }

        .fields-label {
          font-size: 0.75rem;
          color: #666;
          font-weight: 500;
          display: block;
          margin-bottom: 0.5rem;
        }

        .fields-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .field-tag {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          background: #f0f9ff;
          color: #0369a1;
          border-radius: 4px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        .occasion-actions {
          display: flex;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #f0f0f0;
        }

        .edit-btn, .delete-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border: none;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .edit-btn {
          background: #f0f9ff;
          color: #0369a1;
        }

        .edit-btn:hover {
          background: #0369a1;
          color: white;
        }

        .delete-btn {
          background: #fef2f2;
          color: #dc2626;
        }

        .delete-btn:hover {
          background: #dc2626;
          color: white;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #666;
          font-size: 1.1rem;
        }

        /* Popup Styles */
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .popup-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .popup-header h2 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
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
          color: #000;
          background: white;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        textarea.form-input {
          resize: vertical;
          min-height: 80px;
        }

        .fields-input-group {
          display: flex;
          gap: 0.5rem;
        }

        .fields-input-group .form-input {
          flex: 1;
        }

        .add-field-btn {
          padding: 0.75rem 1rem;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s ease;
        }

        .add-field-btn:hover {
          background: #c41e3a;
        }

        .added-fields {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .field-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #f0f9ff;
          color: #0369a1;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
        }

        .remove-field-btn {
          background: none;
          border: none;
          color: #0369a1;
          font-size: 1.25rem;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .remove-field-btn:hover {
          background: #0369a1;
          color: white;
        }

        /* Image Upload Styles */
        .image-upload-placeholder {
          border: 2px dashed #ddd;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .image-upload-placeholder:hover {
          border-color: var(--accent-color);
          background: #fafafa;
        }

        .upload-label {
          cursor: pointer;
          display: block;
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .upload-text {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #333;
          margin-bottom: 0.25rem;
        }

        .upload-hint {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 0.5rem;
        }

        .upload-format {
          font-size: 0.75rem;
          color: #999;
        }

        .image-preview-container {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
        }

        .image-preview {
          width: 100%;
          max-height: 300px;
          object-fit: cover;
          border-radius: 8px;
        }

        .remove-image-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-image-btn:hover {
          background: rgba(220, 38, 38, 0.9);
        }

        .preview-label {
          text-align: center;
          padding: 0.5rem;
          background: #f3f4f6;
          font-size: 0.85rem;
          color: #666;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
        }

        .btn-secondary, .btn-primary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-primary {
          background: var(--accent-color);
          color: white;
        }

        .btn-primary:hover {
          background: #c41e3a;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-danger {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #dc2626;
          color: white;
        }

        .btn-danger:hover {
          background: #b91c1c;
        }

        .delete-confirm-popup {
          max-width: 400px;
        }

        .delete-confirm-popup .popup-body {
          color: #333;
        }

        .delete-confirm-popup .popup-body p {
          color: #333 !important;
          margin: 0;
          line-height: 1.6;
        }

        .popup-footer {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        /* Toast Notification */
        .toast {
          position: fixed;
          top: 2rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          color: white;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 2000;
          animation: slideIn 0.3s ease;
        }

        .toast-success {
          background: #10b981;
        }

        .toast-error {
          background: #ef4444;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

