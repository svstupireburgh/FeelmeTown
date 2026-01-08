'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

interface Staff {
  _id?: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female';
  profilePhoto: string;
  photoType: 'upload' | 'avatar';
  role: 'staff';
  isActive: boolean;
  password?: string;
  createdAt?: Date;
}

export default function StaffListPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; staffId?: string; profilePhoto?: string }>({ show: false });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'male' as 'male' | 'female',
    profilePhoto: '',
    photoType: 'upload' as 'upload' | 'avatar',
    role: 'staff' as const,
    password: ''
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatars, setAvatars] = useState<string[]>([]);

  useEffect(() => {
    fetchStaff();
    
    // Set up silent real-time updates every 60 seconds
    const interval = setInterval(() => {
      fetchStaff();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showAvatarModal) {
      loadAvatars();
    }
  }, [showAvatarModal, formData.gender]);

  const loadAvatars = () => {
    const gender = formData.gender;
    const avatarList: string[] = [];
    
    // Load avatars based on gender
    if (gender === 'male') {
      for (let i = 1; i <= 19; i++) {
        avatarList.push(`/images/Avatars/male/avatar${i}.svg`);
      }
    } else {
      for (let i = 1; i <= 22; i++) {
        avatarList.push(`/images/Avatars/female/avatar${i}.svg`);
      }
    }
    
    setAvatars(avatarList);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/admin/staff');
      const data = await response.json();
      
      if (data.success) {
        setStaff(data.staff);
      }
    } catch (error) {
      
      showToast('Failed to fetch staff', 'error');
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
    setFormData({ ...formData, profilePhoto: '', photoType: 'upload' });
  };

  const handleSelectAvatar = (avatarUrl: string) => {
    setImagePreview(avatarUrl);
    setFormData({ ...formData, profilePhoto: avatarUrl, photoType: 'avatar' });
    setShowAvatarModal(false);
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

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', 'FMTStaff');
    cloudinaryFormData.append('folder', 'feelmetown/staff');

    const cloudName = await getCloudinaryCloudName();
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: cloudinaryFormData
    });

    const data = await response.json();
    return data.secure_url;
  };

  const handleAddUser = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      gender: 'male',
      profilePhoto: '',
      photoType: 'upload',
      role: 'staff',
      password: ''
    });
    setImagePreview('');
    setSelectedImageFile(null);
    setShowAddPopup(true);
  };

  const handleEditStaff = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      gender: staffMember.gender,
      profilePhoto: staffMember.profilePhoto,
      photoType: staffMember.photoType,
      role: staffMember.role,
      password: '' // Don't show existing password for security
    });
    setImagePreview(staffMember.profilePhoto);
    setSelectedImageFile(null);
    setShowAddPopup(true);
  };

  const handleSaveStaff = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    // For new staff, password is required
    if (!editingStaff && !formData.password.trim()) {
      showToast('Password is required for new staff members', 'error');
      return;
    }

    if (!selectedImageFile && !formData.profilePhoto) {
      showToast('Please upload a profile photo', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      let profilePhotoUrl = formData.profilePhoto;

      // Upload image to Cloudinary only if new image selected and photoType is 'upload'
      if (selectedImageFile && formData.photoType === 'upload') {
        profilePhotoUrl = await uploadImageToCloudinary(selectedImageFile);
      }

      const userData = {
        ...formData,
        profilePhoto: profilePhotoUrl
      };

      const url = editingStaff 
        ? `/api/admin/staff?id=${editingStaff._id}`
        : '/api/admin/staff';
      
      const method = editingStaff ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        showToast(editingStaff ? 'Staff updated successfully!' : 'Staff added successfully!', 'success');
        
        // Send welcome email for new staff
        if (!editingStaff) {
          try {
            await fetch('/api/email/staff-welcome', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: userData.name,
                email: userData.email,
                profilePhoto: profilePhotoUrl
              })
            });
          } catch (error) {
            
          }
        }
        
        setShowAddPopup(false);
        fetchStaff();
      } else {
        showToast(data.error || 'Failed to save staff', 'error');
      }
    } catch (error) {
      
      showToast('Failed to save staff', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteClick = (staffMember: Staff) => {
    setDeleteConfirm({ 
      show: true, 
      staffId: staffMember._id, 
      profilePhoto: staffMember.photoType === 'upload' ? staffMember.profilePhoto : undefined 
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.staffId) return;

    try {
      // Delete from Cloudinary if profile photo exists
      if (deleteConfirm.profilePhoto) {
        try {
          await fetch('/api/admin/delete-cloudinary-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: deleteConfirm.profilePhoto })
          });
        } catch (error) {
          
        }
      }

      const response = await fetch(`/api/admin/staff?id=${deleteConfirm.staffId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showToast('Staff deleted successfully!', 'success');
        fetchStaff();
      } else {
        showToast(data.error || 'Failed to delete staff', 'error');
      }
    } catch (error) {
      
      showToast('Failed to delete staff', 'error');
    } finally {
      setDeleteConfirm({ show: false });
    }
  };

  const handleToggleStatus = async (staffMember: Staff) => {
    try {
      const response = await fetch(`/api/admin/staff?id=${staffMember._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !staffMember.isActive })
      });

      const data = await response.json();

      if (data.success) {
        showToast(`Staff ${!staffMember.isActive ? 'activated' : 'deactivated'} successfully!`, 'success');
        fetchStaff();
      } else {
        showToast(data.error || 'Failed to update user status', 'error');
      }
    } catch (error) {
      
      showToast('Failed to update user status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="user-list-page">
        <div className="loading">Loading staff...</div>
      </div>
    );
  }

  return (
    <div className="user-list-page">
      <div className="page-header">
        <h1>Staff Management</h1>
        <div className="header-actions">
          <div className="total-count">
            <span className="count-number">{staff.filter(u => u.isActive).length}</span>
            <span className="count-label">Active Staff</span>
          </div>
          <button className="add-btn" onClick={handleAddUser}>
            <Plus size={20} />
            Add Staff
          </button>
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No Staff Members</h3>
          <p>Get started by adding your first staff member</p>
          <button className="empty-add-btn" onClick={handleAddUser}>
            <Plus size={20} />
            Add Staff Member
          </button>
        </div>
      ) : (
        <div className="staff-table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="profile-photo-cell">
                      <img src={user.profilePhoto} alt={user.name} className="profile-photo-thumb" />
                    </div>
                  </td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <label className="status-toggle">
                        <input 
                          type="checkbox" 
                          checked={user.isActive}
                          onChange={() => handleToggleStatus(user)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <button className="edit-btn" onClick={() => handleEditStaff(user)}>
                        <Edit size={18} />
                      </button>
                      <button className="delete-btn" onClick={() => handleDeleteClick(user)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit User Popup */}
      {showAddPopup && (
        <div className="popup-overlay" onClick={() => setShowAddPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
              <button className="close-btn" onClick={() => setShowAddPopup(false)}>×</button>
            </div>
            
            <div className="popup-body">
              {/* Profile Photo Section - Top */}
              <div className="form-group photo-section">
                <label>Profile Photo *</label>
                <div className="photo-selection-area">
                  {!imagePreview ? (
                    <div className="circular-placeholder">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                        id="profile-photo-upload"
                      />
                      <label htmlFor="profile-photo-upload" className="circular-upload-label">
                        <div className="upload-icon">📷</div>
                        <div className="upload-text">Upload Photo</div>
                      </label>
                    </div>
                  ) : (
                    <div className="circular-preview">
                      <img src={imagePreview} alt="Preview" className="circular-preview-img" />
                      <button className="remove-circular-btn" onClick={removeImage}>✕</button>
                    </div>
                  )}
                  
                  <div className="avatar-option">
                    <button 
                      type="button" 
                      className="avatar-btn" 
                      onClick={() => setShowAvatarModal(true)}
                    >
                      Choose Avatar
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Gender *</label>
                <select
                  className="form-input"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter staff name"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>

              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              {editingStaff?.password ? (
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStaff.password}
                    disabled
                  />
                </div>
              ) : null}

              <div className="form-group">
                <label>Password {!editingStaff ? '*' : '(leave blank to keep current)'}</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingStaff ? "Enter new password (optional)" : "Enter password for staff login"}
                />
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowAddPopup(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleSaveStaff}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading...' : editingStaff ? 'Update Staff' : 'Add Staff'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="popup-overlay" onClick={() => setShowAvatarModal(false)}>
          <div className="popup-content avatar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Choose Avatar ({formData.gender === 'male' ? 'Male' : 'Female'})</h2>
              <button className="close-btn" onClick={() => setShowAvatarModal(false)}>×</button>
            </div>
            <div className="popup-body">
              <div className="avatars-grid">
                {avatars.map((avatar, index) => (
                  <div 
                    key={index} 
                    className="avatar-option-item"
                    onClick={() => handleSelectAvatar(avatar)}
                  >
                    <img src={avatar} alt={`Avatar ${index + 1}`} />
                  </div>
                ))}
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
              <p>Are you sure you want to delete this staff member? This action cannot be undone.</p>
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
        .user-list-page {
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

        .empty-state {
          background: white;
          border-radius: 12px;
          padding: 4rem 2rem;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          font-size: 1rem;
          color: #666;
          margin-bottom: 2rem;
        }

        .empty-add-btn {
          display: inline-flex;
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

        .empty-add-btn:hover {
          background: #c41e3a;
        }

        .staff-table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .staff-table {
          width: 100%;
          border-collapse: collapse;
        }

        .staff-table thead {
          background: #f9fafb;
        }

        .staff-table th {
          padding: 1rem;
          text-align: left;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        .staff-table td {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          color: #6b7280;
        }

        .staff-table tbody tr:hover {
          background: #f9fafb;
        }

        .profile-photo-cell {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-photo-thumb {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e5e7eb;
        }

        .role-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .role-staff {
          background: #dbeafe;
          color: #1e40af;
        }

        .role-manager {
          background: #fef3c7;
          color: #92400e;
        }

        .role-admin {
          background: #fce7f3;
          color: #9f1239;
        }

        .status-badge {
          display: inline-block;
          padding: 0.35rem 0.85rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
        }

        .status-active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-toggle {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 26px;
          cursor: pointer;
        }

        .status-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
          border-radius: 26px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        .status-toggle input:checked + .toggle-slider {
          background-color: #10b981;
        }

        .status-toggle input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .status-toggle:hover .toggle-slider {
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .edit-btn, .delete-btn {
          padding: 0.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
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
          max-width: 500px;
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

        /* Profile Photo Section */
        .photo-section {
          text-align: center;
          margin-bottom: 2rem;
        }

        .photo-selection-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .circular-placeholder {
          width: 150px;
          height: 150px;
          border: 3px dashed #ddd;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .circular-placeholder:hover {
          border-color: var(--accent-color);
          background: #f0f0f0;
        }

        .circular-upload-label {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .upload-text {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          color: #666;
        }

        .circular-preview {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          border: 3px solid var(--accent-color);
        }

        .circular-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-circular-btn {
          position: absolute;
          top: 5px;
          right: 5px;
          background: rgba(220, 38, 38, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s ease;
        }

        .remove-circular-btn:hover {
          background: #dc2626;
        }

        .avatar-option {
          margin-top: 0.5rem;
        }

        .avatar-btn {
          padding: 0.5rem 1.5rem;
          background: #f0f9ff;
          color: #0369a1;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .avatar-btn:hover {
          background: #0369a1;
          color: white;
        }

        .avatar-modal {
          max-width: 700px;
        }

        .avatars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          padding: 1rem;
        }

        .avatar-option-item {
          width: 100%;
          aspect-ratio: 1;
          border: 2px solid #e5e7eb;
          border-radius: 50%;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
        }

        .avatar-option-item:hover {
          border-color: var(--accent-color);
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .avatar-option-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
        }

        .btn-secondary, .btn-primary, .btn-danger {
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

        .btn-danger {
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

