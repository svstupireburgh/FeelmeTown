'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface GalleryImage {
  _id?: string;
  imageId?: string;
  imageUrl: string;
  title?: string;
  category?: string;
  createdAt?: Date;
  isActive?: boolean;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchGalleryImages = async () => {
    try {
      const response = await fetch('/api/admin/gallery');
      const data = await response.json();
      
      if (data.success) {
        setImages(data.images || []);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));

    if (validFiles.length === 0) {
      showToast('Please select valid image files', 'error');
      return;
    }

    setSelectedImageFiles(validFiles);

    // Generate previews for all selected files
    const previews: string[] = [];
    let loadedCount = 0;

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        loadedCount++;
        
        if (loadedCount === validFiles.length) {
          setImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
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
        showToast('Cloudinary cloud name not configured', 'error');
        return null;
      }

      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);
      formDataToUpload.append('upload_preset', 'FMTGallery');
      formDataToUpload.append('folder', 'feelmetown/gallery');

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

  const handleAddImages = async () => {
    try {
      if (selectedImageFiles.length === 0) {
        showToast('Please select at least one image', 'error');
        return;
      }

      // Close add popup and show upload progress popup
      setShowAddPopup(false);
      setUploadProgress({ current: 0, total: selectedImageFiles.length });

      let successCount = 0;
      let failCount = 0;

      // Upload all selected images
      for (let i = 0; i < selectedImageFiles.length; i++) {
        const file = selectedImageFiles[i];
        
        try {
          // Upload to Cloudinary
          const uploadedUrl = await uploadImageToCloudinary(file);
          if (!uploadedUrl) {
            failCount++;
            setUploadProgress({ current: i + 1, total: selectedImageFiles.length });
            continue;
          }

          // Save to database
          const response = await fetch('/api/admin/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: uploadedUrl
            })
          });

          const data = await response.json();

          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
          
          // Update progress
          setUploadProgress({ current: i + 1, total: selectedImageFiles.length });
        } catch (error) {
          
          failCount++;
          setUploadProgress({ current: i + 1, total: selectedImageFiles.length });
        }
      }

      // Close progress popup
      setUploadProgress(null);
      setSelectedImageFiles([]);
      setImagePreviews([]);

      // Show result
      if (successCount > 0) {
        showToast(`${successCount} image(s) added successfully!`, 'success');
        fetchGalleryImages();
      }
      
      if (failCount > 0) {
        showToast(`${failCount} image(s) failed to upload`, 'error');
      }
    } catch (error) {
      
      showToast('Failed to add gallery images', 'error');
      setUploadProgress(null);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleDeleteClick = (imageId: string, imageUrl: string) => {
    setSelectedImages([imageId]);
    setDeleteConfirm(imageId);
  };

  const handleDeleteSelected = () => {
    if (selectedImages.length === 0) {
      showToast('Please select images to delete', 'error');
      return;
    }
    setDeleteConfirm('multiple');
  };

  const handleConfirmDelete = async () => {
    try {
      const imagesToDelete = deleteConfirm === 'multiple' ? selectedImages : [deleteConfirm || ''];
      
      // Close confirmation popup and show delete progress
      setDeleteConfirm(null);
      setDeleteProgress({ current: 0, total: imagesToDelete.length });
      
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < imagesToDelete.length; i++) {
        const imageId = imagesToDelete[i];
        
        try {
          // Find the image to get its URL
          const imageToDelete = images.find(img => (img.imageId === imageId) || (String(img._id) === imageId));
          
          if (!imageToDelete) {
            
            failCount++;
            setDeleteProgress({ current: i + 1, total: imagesToDelete.length });
            continue;
          }

          const imageUrl = imageToDelete.imageUrl || '';
          const deleteUrl = `/api/admin/gallery?imageId=${encodeURIComponent(imageId)}&imageUrl=${encodeURIComponent(imageUrl)}`;

          const response = await fetch(deleteUrl, {
            method: 'DELETE'
          });

          const data = await response.json();

          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
          
          // Update progress
          setDeleteProgress({ current: i + 1, total: imagesToDelete.length });
        } catch (error) {
          
          failCount++;
          setDeleteProgress({ current: i + 1, total: imagesToDelete.length });
        }
      }

      // Close delete progress popup
      setDeleteProgress(null);
      setSelectedImages([]);
      setSelectionMode(false);

      if (successCount > 0) {
        showToast(`${successCount} image(s) deleted successfully!`, 'success');
        fetchGalleryImages();
      }

      if (failCount > 0) {
        showToast(`${failCount} image(s) failed to delete`, 'error');
      }
    } catch (error) {
      
      showToast('Failed to delete gallery images', 'error');
      setDeleteProgress(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading gallery...</div>;
  }

  return (
    <div className="gallery-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === 'success' ? '✓' : '✕'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="header-content">
          <h1>Gallery Management</h1>
          <p>Manage gallery images for your website</p>
        </div>
        <div className="header-actions">
          <button 
            className={`selection-mode-btn ${selectionMode ? 'active' : ''}`}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedImages([]);
            }}
          >
            {selectionMode ? 'Cancel Selection' : 'Select Multiple'}
          </button>
          {selectionMode && selectedImages.length > 0 && (
            <button className="delete-selected-btn" onClick={handleDeleteSelected}>
              <Trash2 size={18} />
              Delete {selectedImages.length} Image(s)
            </button>
          )}
          <button className="add-image-btn" onClick={() => setShowAddPopup(true)}>
            <Plus size={20} />
            Add New Image
          </button>
        </div>
      </div>

      <div className="gallery-grid">
        {images.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#666' }}>
            <p>No images found. Click "Add New Image" to upload.</p>
          </div>
        ) : (
          images.map((image) => (
            <div 
              key={image.imageId || image._id} 
              className={`gallery-item ${selectionMode && selectedImages.includes(image.imageId || '') ? 'selected' : ''}`}
              onClick={() => selectionMode && toggleImageSelection(image.imageId || '')}
              style={{ cursor: selectionMode ? 'pointer' : 'default' }}
            >
              {selectionMode && (
                <div className="selection-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(image.imageId || '')}
                    onChange={() => toggleImageSelection(image.imageId || '')}
                  />
                </div>
              )}
              <img src={image.imageUrl} alt={image.title || 'Gallery'} className="gallery-img" />
              {!selectionMode && (
                <div className="gallery-overlay">
                  <button className="delete-btn" onClick={() => handleDeleteClick(image.imageId || '', image.imageUrl)}>
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              )}
              {image.title && <p className="image-title">{image.title}</p>}
            </div>
          ))
        )}
      </div>

      {/* Upload Progress Popup */}
      {uploadProgress && (
        <div className="popup-overlay">
          <div className="popup-content small-popup">
            <div className="popup-header">
              <h2>Uploading Images</h2>
            </div>
            <div className="popup-body">
              <div className="progress-container">
                <div className="progress-text">
                  <span className="progress-count">
                    {uploadProgress.current} / {uploadProgress.total}
                  </span>
                  <span className="progress-label">images uploaded</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="loading-animation">
                  <div className="spinner"></div>
                  <p>Please wait, uploading to Cloudinary...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Progress Popup */}
      {deleteProgress && (
        <div className="popup-overlay">
          <div className="popup-content small-popup">
            <div className="popup-header">
              <h2>Deleting Images</h2>
            </div>
            <div className="popup-body">
              <div className="progress-container">
                <div className="progress-text">
                  <span className="progress-count">
                    {deleteProgress.current} / {deleteProgress.total}
                  </span>
                  <span className="progress-label">images deleted</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="loading-animation">
                  <div className="spinner"></div>
                  <p>Deleting from Cloudinary and Database...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deleteConfirm && (
        <div className="popup-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="popup-content small-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Delete Image</h2>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="popup-body">
              <p style={{ margin: '1rem 0', fontSize: '1rem', color: '#333' }}>
                {deleteConfirm === 'multiple' 
                  ? `Are you sure you want to delete ${selectedImages.length} selected image(s)? This action cannot be undone.`
                  : 'Are you sure you want to delete this image? This action cannot be undone.'
                }
              </p>
            </div>
            <div className="popup-footer">
              <button onClick={() => setDeleteConfirm(null)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="btn-delete">
                {deleteConfirm === 'multiple' 
                  ? `Delete ${selectedImages.length} Image(s)`
                  : 'Delete Image'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Image Popup */}
      {showAddPopup && (
        <div className="popup-overlay" onClick={() => setShowAddPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Add Gallery Image</h2>
              <button className="close-btn" onClick={() => setShowAddPopup(false)}>×</button>
            </div>
            
            <div className="popup-body">
              <div className="form-group">
                <label>Select Images * (Single or Multiple)</label>
                <div className="image-upload-section">
                  {imagePreviews.length === 0 ? (
                    <label htmlFor="gallery-image" className="image-upload-area">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="image-input"
                        id="gallery-image"
                        multiple
                      />
                      <div className="upload-placeholder">
                        <svg className="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p className="upload-text">Click to upload gallery images</p>
                        <p className="upload-hint">Select single or multiple images</p>
                        <p className="upload-format">PNG, JPG, WEBP up to 10MB each</p>
                      </div>
                    </label>
                  ) : (
                    <div className="previews-container">
                      <div className="preview-header">
                        <span>{selectedImageFiles.length} image(s) selected</span>
                        <button 
                          type="button" 
                          className="clear-all-btn"
                          onClick={() => {
                            setImagePreviews([]);
                            setSelectedImageFiles([]);
                          }}
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="preview-grid">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="preview-item">
                            <img src={preview} alt={`Preview ${index + 1}`} />
                            <button 
                              type="button" 
                              className="remove-preview-btn"
                              onClick={() => {
                                setImagePreviews(prev => prev.filter((_, i) => i !== index));
                                setSelectedImageFiles(prev => prev.filter((_, i) => i !== index));
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="popup-footer">
              <button onClick={() => setShowAddPopup(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleAddImages} className="btn-save" disabled={uploadingImage}>
                {uploadingImage ? `Uploading ${selectedImageFiles.length} image(s)...` : `Add ${selectedImageFiles.length} Image(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .gallery-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
        }

        /* Toast Notification */
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 99999;
          animation: slideIn 0.3s ease-out, slideOut 0.3s ease-in 2.7s;
          min-width: 300px;
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

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .selection-mode-btn {
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .selection-mode-btn.active {
          background: var(--accent-color);
        }

        .selection-mode-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .delete-selected-btn {
          background: #dc3545;
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

        .delete-selected-btn:hover {
          background: #c82333;
          transform: translateY(-1px);
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

        .add-image-btn {
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

        .add-image-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .gallery-item {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .gallery-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .gallery-item:hover .gallery-overlay {
          opacity: 1;
        }

        .gallery-item.selected {
          outline: 4px solid var(--accent-color);
          outline-offset: -4px;
        }

        .selection-checkbox {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          z-index: 10;
        }

        .selection-checkbox input[type="checkbox"] {
          width: 24px;
          height: 24px;
          cursor: pointer;
          accent-color: var(--accent-color);
        }

        .gallery-img {
          width: 100%;
          height: 250px;
          object-fit: cover;
          display: block;
        }

        .gallery-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .delete-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.6rem 1.2rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .delete-btn:hover {
          background: #c82333;
          transform: scale(1.05);
        }

        .image-title {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.75rem;
          margin: 0;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
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

        /* Multiple Images Preview */
        .previews-container {
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          background: #f8f9fa;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #ddd;
        }

        .preview-header span {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #333;
        }

        .clear-all-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.4rem 0.8rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clear-all-btn:hover {
          background: #c82333;
        }

        .preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 1rem;
        }

        .preview-item {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #ddd;
        }

        .preview-item img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          display: block;
        }

        .remove-preview-btn {
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          background: rgba(220, 53, 69, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          font-size: 1.2rem;
          cursor: pointer;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-preview-btn:hover {
          background: #dc3545;
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

        .btn-save:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .btn-delete {
          background: #dc3545;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-delete:hover {
          background: #c82333;
        }

        .small-popup {
          max-width: 450px;
        }

        /* Upload Progress Styles */
        .progress-container {
          text-align: center;
          padding: 2rem 1rem;
        }

        .progress-text {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .progress-count {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--accent-color);
        }

        .progress-label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #666;
        }

        .progress-bar-container {
          width: 100%;
          height: 12px;
          background: #e9ecef;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-color), var(--accent-hover));
          transition: width 0.3s ease;
          border-radius: 20px;
        }

        .loading-animation {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid var(--accent-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-animation p {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #666;
          margin: 0;
        }

        @media (max-width: 768px) {
          .gallery-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .gallery-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
          }

          .popup-content {
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
}

