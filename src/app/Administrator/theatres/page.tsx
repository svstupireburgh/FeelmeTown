'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, Users, Eye, X, Download } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import ConfirmationModal from '@/components/ConfirmationModal';

interface Theater {
  _id?: string;
  theaterId?: string;
  name: string;
  type?: string; // Theater Type field added
  price: number;
  capacity: {
    min: number;
    max: number;
  };
  image: string;
  images?: string[]; // Multiple images support
  youtubeLink?: string; // YouTube video link
  whatsIncluded: string[];
  isActive?: boolean;
  decorationCompulsory?: boolean; // Decoration compulsory toggle
  timeSlots?: {
    slotId: string;
    startTime: string;
    endTime: string;
    duration: number;
    isActive: boolean;
  }[];
}

export default function TheatresPage() {
  const { toasts, showSuccess, showError, showWarning, removeToast } = useToast();
  const [theatres, setTheatres] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [editingTheater, setEditingTheater] = useState<Theater | null>(null);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Theater>({
    name: '',
    type: '',
    price: 0,
    capacity: { min: 0, max: 0 },
    image: '',
    images: [],
    youtubeLink: '',
    whatsIncluded: [],
    timeSlots: []
  });
  const [includedItem, setIncludedItem] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [viewingIncludes, setViewingIncludes] = useState<string[] | null>(null);
  
  // Time slots form state
  const [timeSlotFormData, setTimeSlotFormData] = useState({
    startTime: '',
    duration: 3
  });

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // For confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [theaterToDelete, setTheaterToDelete] = useState<string | null>(null);

  // Fetch theaters from database
  useEffect(() => {
    fetchTheaters();
  }, []);

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

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      price: 0,
      capacity: { min: 0, max: 0 },
      image: '',
      images: [],
      whatsIncluded: [],
      timeSlots: []
    });
    setImagePreview('');
    setImagePreviews([]);
    setSelectedImageFile(null);
    setSelectedImageFiles([]);
    setIncludedItem('');
    setEditingTheater(null);
    setTimeSlotFormData({ startTime: '', duration: 3 });
  };

  const handleAddTheater = () => {
    resetForm();
    setShowAddPopup(true);
  };

  const handleEditTheater = (theater: Theater) => {
    resetForm();
    setFormData({
      name: theater.name,
      type: theater.type || '',
      price: theater.price,
      capacity: theater.capacity,
      image: theater.image,
      images: theater.images || [],
      youtubeLink: theater.youtubeLink || '',
      whatsIncluded: theater.whatsIncluded || [],
      timeSlots: theater.timeSlots || []
    });
    setImagePreview(theater.image || '');
    setImagePreviews([]); // Don't duplicate existing images in previews
    setEditingTheater(theater);
    setTimeSlotFormData({ startTime: '', duration: 3 });
    setShowAddPopup(true);
  };

  const handleSaveTheater = async () => {
    try {
      // Prevent duplicate submits if already saving
      if (uploadingImage) return;
      setUploadingImage(true);
      
      let imageUrl = formData.image;
      let imageUrls = [...(formData.images || [])];

      // Handle single image upload (main image)
      if (selectedImageFile && selectedImageFiles.length === 0) {
        const uploadedUrl = await uploadImageToCloudinary(selectedImageFile);
        if (!uploadedUrl) {
          showError('Failed to upload image to Cloudinary');
          setUploadingImage(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      // Handle multiple images upload
      if (selectedImageFiles.length > 0) {
        
        
        const uploadPromises = selectedImageFiles.map(file => uploadImageToCloudinary(file));
        const uploadedUrls = await Promise.all(uploadPromises);
        
        // Check if any upload failed
        if (uploadedUrls.some(url => !url)) {
          showError('Failed to upload some images to Cloudinary');
          setUploadingImage(false);
          return;
        }
        
        // For multiple images, store all in images array and use first as main image
        const validUrls = uploadedUrls.filter((url): url is string => url !== null);
        if (validUrls.length > 0) {
          imageUrl = validUrls[0]; // First image as main image
          imageUrls = [...imageUrls, ...validUrls]; // All images in gallery
          
          
        }
      }

      // Validate required fields
      if (!formData.name || !formData.price || (!imageUrl && imageUrls.length === 0)) {
        showError('Please fill all required fields (Name, Price, and at least one Image)');
        setUploadingImage(false);
        return;
      }

      const url = editingTheater 
        ? '/api/admin/theaters' 
        : '/api/admin/theaters';
      
      const method = editingTheater ? 'PUT' : 'POST';
      
      const body = editingTheater 
        ? { ...formData, image: imageUrl, images: imageUrls, theaterId: editingTheater.theaterId }
        : { ...formData, image: imageUrl, images: imageUrls };

      

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(editingTheater ? 'Theater updated successfully!' : 'Theater added successfully!');

        // Optimistically update the list immediately
        const createdTheaterId = editingTheater ? editingTheater.theaterId : data.theaterId;
        const newTheater: Theater = {
          theaterId: createdTheaterId,
          name: formData.name,
          type: formData.type || '',
          price: formData.price,
          capacity: formData.capacity,
          image: imageUrl,
          images: imageUrls,
          whatsIncluded: formData.whatsIncluded,
          timeSlots: formData.timeSlots || [],
          isActive: true
        };

        setTheatres(prev => {
          if (editingTheater && createdTheaterId) {
            return prev.map(t => (String(t.theaterId || t._id) === String(createdTheaterId) ? { ...t, ...newTheater } : t));
          }
          return [...prev, newTheater];
        });

        // Refresh from server for canonical data
        fetchTheaters();

        // Close popup on success
        setShowAddPopup(false);
        setEditingTheater(null);
        setSelectedImageFile(null);
        setSelectedImageFiles([]);
        setImagePreview('');
        setImagePreviews([]);
      } else {
        showError('Error: ' + data.error);
      }
    } catch (error) {
      
      showError('Failed to save theater');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleToggleDecorationCompulsory = async (theater: Theater) => {
    try {
      const newValue = !theater.decorationCompulsory;
      
      // Optimistic UI update
      setTheatres(prevTheatres => 
        prevTheatres.map(t => 
          t._id === theater._id 
            ? { ...t, decorationCompulsory: newValue }
            : t
        )
      );
      
      const response = await fetch(`/api/admin/theaters?theaterId=${theater.theaterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          decorationCompulsory: newValue 
        })
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(`Decoration ${newValue ? 'is now compulsory' : 'is now optional'} for ${theater.name}`);
        fetchTheaters();
      } else {
        // Revert on error
        setTheatres(prevTheatres => 
          prevTheatres.map(t => 
            t._id === theater._id 
              ? { ...t, decorationCompulsory: !newValue }
              : t
          )
        );
        showError(data.error || 'Failed to update theater');
      }
    } catch (error) {
      // Revert on error
      setTheatres(prevTheatres => 
        prevTheatres.map(t => 
          t._id === theater._id 
            ? { ...t, decorationCompulsory: theater.decorationCompulsory }
            : t
        )
      );
      showError('Failed to update theater');
    }
  };

  const handleDeleteTheater = async (theaterId: string) => {
    setTheaterToDelete(theaterId);
    setShowConfirmModal(true);
  };

  const confirmDeleteTheater = async () => {
    if (!theaterToDelete) return;

    try {
      showWarning('Deleting theater and removing images from Cloudinary...');
      
      const response = await fetch(`/api/admin/theaters?theaterId=${theaterToDelete}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Theater and all images deleted successfully!');
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

  const handleDownloadImages = async (theater: Theater) => {
    try {
      showWarning('Preparing images for download...');
      
      // Collect all image URLs
      const imageUrls: string[] = [];
      if (theater.image) imageUrls.push(theater.image);
      if (theater.images && theater.images.length > 0) {
        theater.images.forEach(img => {
          if (img && !imageUrls.includes(img)) imageUrls.push(img);
        });
      }

      if (imageUrls.length === 0) {
        showError('No images found to download');
        return;
      }

      // Download each image
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // Generate filename
          const filename = `${theater.name.replace(/[^a-zA-Z0-9]/g, '_')}_image_${i + 1}.jpg`;
          link.download = filename;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up
          window.URL.revokeObjectURL(url);
          
          // Small delay between downloads
          if (i < imageUrls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          
        }
      }

      showSuccess(`Downloaded ${imageUrls.length} images successfully!`);
    } catch (error) {
      
      showError('Failed to download images');
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

  // Drag and drop handlers for What's Included items
  const handleIncludedDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleIncludedDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleIncludedDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
    
    if (dragIndex === dropIndex) return;
    
    const newItems = [...formData.whatsIncluded];
    const draggedItem = newItems[dragIndex];
    
    // Remove from old position
    newItems.splice(dragIndex, 1);
    // Insert at new position
    newItems.splice(dropIndex, 0, draggedItem);
    
    setFormData({
      ...formData,
      whatsIncluded: newItems
    });
  };

  // Time slot functions
  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
    
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    
    return `${endHours}:${endMinutes}`;
  };

  const getAllTimeSlots = () => {
    const allTimes = [];
    for (let i = 0; i < 48; i++) {
      const hours = Math.floor(i / 2);
      const minutes = (i % 2) * 30;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      allTimes.push(timeString);
    }
    return allTimes;
  };

  const addTimeSlotToForm = () => {
    if (!timeSlotFormData.startTime) {
      showWarning('Please select a start time');
      return;
    }

    const endTime = calculateEndTime(timeSlotFormData.startTime, timeSlotFormData.duration);
    const newSlot = {
      slotId: `SLOT-${Date.now()}`,
      startTime: timeSlotFormData.startTime,
      endTime: endTime,
      duration: timeSlotFormData.duration,
      isActive: true
    };

    setFormData({
      ...formData,
      timeSlots: [...(formData.timeSlots || []), newSlot]
    });

    setTimeSlotFormData({ startTime: '', duration: 3 });
  };

  const removeTimeSlotFromForm = (slotId: string) => {
    setFormData({
      ...formData,
      timeSlots: (formData.timeSlots || []).filter(slot => slot.slotId !== slotId)
    });
  };

  // Close confirmation functions
  const handleCloseConfirm = () => {
    setShowCloseConfirmation(false);
    setShowAddPopup(false);
    setEditingTheater(null);
    // Reset form data
    setFormData({
      name: '',
      type: '',
      price: 0,
      capacity: { min: 0, max: 0 },
      image: '',
      whatsIncluded: [],
      timeSlots: []
    });
    setIncludedItem('');
    setImagePreview('');
    setSelectedImageFile(null);
    setTimeSlotFormData({ startTime: '', duration: 3 });
  };

  const handleCloseCancel = () => {
    setShowCloseConfirmation(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
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

  const handleMultipleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      showError('Please select only image files');
      return;
    }

    // If only 1 file selected, treat as main image
    if (files.length === 1) {
      const file = files[0];
      setSelectedImageFile(file);
      
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Multiple files - check total limit (existing + new + adding)
      const existingCount = formData.images?.length || 0;
      const newCount = imagePreviews.length;
      const totalCurrent = existingCount + newCount;
      
      if (totalCurrent + files.length > 6) {
        showError(`You can have maximum 6 images total. Currently: ${totalCurrent} (${existingCount} existing + ${newCount} new), trying to add: ${files.length}`);
        return;
      }

      // Store files for later upload (append to existing)
      setSelectedImageFiles(prev => [...prev, ...files]);

      // Show previews immediately
      const previewPromises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(previewPromises).then(previews => {
        setImagePreviews(prev => [...prev, ...previews]); // Add to existing previews
      });
    }

    // Clear the input to allow re-selecting the same files
    e.target.value = '';
  };

  const removeImagePreview = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (index: number) => {
    if (!formData.images || !editingTheater) return;
    
    const imageToDelete = formData.images[index];
    if (!imageToDelete) return;

    try {
      // Show loading state
      const updatedImages = formData.images.filter((_, i) => i !== index);
      setFormData({ ...formData, images: updatedImages });

      // Delete from Cloudinary
      if (imageToDelete.includes('cloudinary.com')) {
        console.log('🗑️ Deleting image from Cloudinary:', imageToDelete);
        
        const deleteResponse = await fetch('/api/admin/delete-cloudinary-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: imageToDelete })
        });

        if (!deleteResponse.ok) {
          console.error('❌ Failed to delete image from Cloudinary');
          showError('Failed to delete image from Cloudinary');
        } else {
          console.log('✅ Image deleted from Cloudinary');
        }
      }

      // Update theater in database immediately
      const updateResponse = await fetch('/api/admin/theaters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images: updatedImages,
          theaterId: editingTheater.theaterId
        })
      });

      if (updateResponse.ok) {
        showSuccess('Image removed successfully');
        // Refresh theater list to show updated data
        fetchTheaters();
      } else {
        showError('Failed to update theater in database');
      }

    } catch (error) {
      console.error('❌ Error removing image:', error);
      showError('Failed to remove image');
      // Revert the UI change if database update failed
      setFormData({ ...formData, images: formData.images });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    try {
      // Create new array with reordered items
      const newTheatres = [...theatres];
      const draggedItem = newTheatres[draggedIndex];
      
      // Remove dragged item
      newTheatres.splice(draggedIndex, 1);
      
      // Insert at new position
      newTheatres.splice(dropIndex, 0, draggedItem);
      
      // Update local state immediately for smooth UX
      setTheatres(newTheatres);
      
      // Update order in database
      const orderUpdates = newTheatres.map((theatre, index) => ({
        theaterId: theatre.theaterId,
        displayOrder: index + 1
      }));

      const response = await fetch('/api/admin/theaters/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderUpdates })
      });

      if (response.ok) {
        showSuccess('Theater order updated successfully');
      } else {
        showError('Failed to update theater order');
        // Revert on failure
        fetchTheaters();
      }

    } catch (error) {
      console.error('❌ Error reordering theaters:', error);
      showError('Failed to reorder theaters');
      // Revert on failure
      fetchTheaters();
    } finally {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
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
          theatres.map((theatre, index) => (
            <div 
              key={theatre.theaterId || theatre._id} 
              className={`theatre-card ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              {/* Drag handle and position indicator */}
              <div className="drag-handle" title="Drag to reorder">
                <div className="position-indicator">#{index + 1}</div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="12" r="1"></circle>
                  <circle cx="9" cy="5" r="1"></circle>
                  <circle cx="9" cy="19" r="1"></circle>
                  <circle cx="15" cy="12" r="1"></circle>
                  <circle cx="15" cy="5" r="1"></circle>
                  <circle cx="15" cy="19" r="1"></circle>
                </svg>
              </div>

              <div className="theatre-image-wrapper">
                <img src={theatre.image || '/images/theater1.webp'} alt={theatre.name} className="theatre-img" />
              </div>
            
              <div className="theatre-content">
                <h3 className="theatre-title">{theatre.name}</h3>
                {theatre.type && (
                  <div className="theatre-type">
                    <span className="type-badge">{theatre.type}</span>
                  </div>
                )}
                <div className="theatre-price">₹{(theatre.price || 0).toLocaleString()}</div>
                
                <div className="capacity-info">
                  <span className="capacity-label">Capacity:</span>
                  <span className="capacity-value">
                    {theatre.capacity?.min || 0} - {theatre.capacity?.max || 0} people
                  </span>
                </div>

                <div className="time-slots-info">
                  <span className="slots-label">Time Slots:</span>
                  <span className="slots-value">{theatre.timeSlots?.length || 0} slots</span>
                </div>

                {/* Decoration Compulsory Toggle */}
                <div className="decoration-toggle-section">
                  <label className="toggle-container">
                    <input
                      type="checkbox"
                      checked={theatre.decorationCompulsory || false}
                      onChange={() => handleToggleDecorationCompulsory(theatre)}
                    />
                    <span className="toggle-label">Decoration Compulsory</span>
                  </label>
                </div>
              
                <div className="whats-included-section">
                  <div className="included-header">
                    <span className="included-label">What's Included:</span>
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
                  <button className="action-btn download-btn" onClick={() => handleDownloadImages(theatre)}>
                    <Download size={16} />
                    Download ({((theatre.image ? 1 : 0) + (theatre.images?.length || 0))} images)
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
              <h2>What's Included</h2>
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
        <div className="popup-overlay" onClick={() => setShowCloseConfirmation(true)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>{editingTheater ? 'Edit Theater' : 'Add New Theater'}</h2>
              <button className="close-btn" onClick={() => setShowCloseConfirmation(true)}>×</button>
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
                <label>Theater Type</label>
                <input
                  type="text"
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="Enter theater type (e.g., VIP, Premium, Family, etc.)"
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
                <label>YouTube Video Link (Optional)</label>
                <input
                  type="url"
                  value={formData.youtubeLink || ''}
                  onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
                  placeholder="Enter YouTube video URL (e.g., https://www.youtube.com/watch?v=...)"
                  className="form-input"
                />
                <small style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                  Add a YouTube video link to showcase your theater. The video will appear on the theater page.
                </small>
                
                {/* YouTube Video Preview */}
                {formData.youtubeLink && (() => {
                  // Extract YouTube video ID from URL
                  const getYouTubeVideoId = (url: string) => {
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                    const match = url.match(regExp);
                    return (match && match[2].length === 11) ? match[2] : null;
                  };
                  
                  const videoId = getYouTubeVideoId(formData.youtubeLink);
                  
                  if (videoId) {
                    return (
                      <div style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>
                          Video Preview:
                        </label>
                        <div style={{ 
                          position: 'relative', 
                          paddingBottom: '56.25%', 
                          height: 0, 
                          overflow: 'hidden',
                          borderRadius: '8px',
                          background: '#000'
                        }}>
                          <iframe
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              border: 'none',
                              borderRadius: '8px'
                            }}
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube video preview"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="form-group">
                <label>Theater Images *</label>
                <div className="image-upload-section">
                  {!imagePreview && imagePreviews.length === 0 ? (
                    <label htmlFor="theater-images" className="image-upload-area unified-upload">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleMultipleImageSelect}
                        className="image-input"
                        id="theater-images"
                      />
                      <div className="upload-placeholder">
                        <svg className="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p className="upload-text">Click to upload theater images</p>
                        <p className="upload-hint">Select 1 image or multiple images (Max 6)</p>
                        <p className="upload-format">PNG, JPG, WEBP up to 10MB each</p>
                      </div>
                    </label>
                  ) : (
                    <div className="images-preview-section">
                      {/* Main Theater Image - Show when editing or single image */}
                      {(imagePreview || (editingTheater && formData.image)) && (
                        <div className="main-image-preview">
                          <h4>Main Theater Image:</h4>
                          <div className="image-preview-container">
                            <img 
                              src={imagePreview || formData.image} 
                              alt="Main Theater Image" 
                              className="preview-image" 
                            />
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
                          </div>
                        </div>
                      )}

                      {/* All theater images preview (existing + new) */}
                      {(imagePreviews.length > 0 || (formData.images && formData.images.length > 0)) && (
                        <div className="multiple-images-preview">
                          <h4>All Theater Images ({(formData.images?.length || 0) + imagePreviews.length}/6):</h4>
                          <div className="images-grid">
                            {/* Show existing images first */}
                            {formData.images && formData.images.map((imageUrl, index) => (
                              <div key={`existing-${index}`} className="image-preview-container small">
                                <img src={imageUrl} alt={`Existing ${index + 1}`} className="preview-image" />
                                <div className="image-label existing">Existing</div>
                                <button 
                                  type="button" 
                                  className="remove-image-btn"
                                  onClick={() => removeExistingImage(index)}
                                  title="Delete image permanently"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            
                            {/* Show new images after existing ones */}
                            {imagePreviews.map((preview, index) => (
                              <div key={`new-${index}`} className="image-preview-container small">
                                <img src={preview} alt={`New ${index + 1}`} className="preview-image" />
                                <div className="image-label new">New</div>
                                <button 
                                  type="button" 
                                  className="remove-image-btn"
                                  onClick={() => removeImagePreview(index)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add more images button */}
                      <label htmlFor="theater-images-add" className="add-more-images-btn">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleMultipleImageSelect}
                          className="image-input"
                          id="theater-images-add"
                        />
                        + Add More Images
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group" style={{display: 'none'}}>
                <label>Additional Images (Hidden - Legacy)</label>
                <div className="image-upload-section">
                  
                  {/* Show all theater images (existing + new) combined */}
                  {((formData.images && formData.images.length > 0) || imagePreviews.length > 0) && (
                    <div className="all-images-section">
                      <h4>All Theater Images ({(formData.images?.length || 0) + imagePreviews.length}/6):</h4>
                      <div className="images-grid">
                        {/* Show existing images first */}
                        {formData.images && formData.images.map((imageUrl, index) => (
                          <div key={`existing-${index}`} className="image-preview-container small">
                            <img src={imageUrl} alt={`Existing ${index + 1}`} className="preview-image" />
                            <div className="image-label">Existing</div>
                            <button 
                              type="button" 
                              className="remove-image-btn"
                              onClick={() => removeExistingImage(index)}
                              title="Delete image permanently"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        
                        {/* Show new images after existing ones */}
                        {imagePreviews.map((preview, index) => (
                          <div key={`new-${index}`} className="image-preview-container small">
                            <img src={preview} alt={`New ${index + 1}`} className="preview-image" />
                            <div className="image-label">New</div>
                            <button 
                              type="button" 
                              className="remove-image-btn"
                              onClick={() => removeImagePreview(index)}
                              title="Delete image permanently"
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

              <div className="form-group">
                <label>What's Included</label>
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
                    <div 
                      key={index} 
                      className="included-item"
                      draggable
                      onDragStart={(e) => handleIncludedDragStart(e, index)}
                      onDragOver={handleIncludedDragOver}
                      onDrop={(e) => handleIncludedDrop(e, index)}
                      style={{ cursor: 'move' }}
                    >
                      <span className="item-number">{index + 1}.</span>
                      <span className="item-text">{item}</span>
                      <button onClick={() => removeIncludedItem(index)} className="remove-item-btn">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Slots Section */}
              <div className="form-group">
                <label>Time Slots</label>
                
                {/* Current Time Slots */}
                <div className="time-slots-list">
                  {(formData.timeSlots || []).length === 0 ? (
                    <div className="empty-slots-message">
                      <p>No time slots added yet</p>
                    </div>
                  ) : (
                    (formData.timeSlots || []).map((slot, index) => (
                      <div key={slot.slotId || index} className="time-slot-item-form">
                        <div className="slot-time-info">
                          <span className="slot-time-text">
                            {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}
                          </span>
                          <span className="slot-duration-text">({slot.duration}h)</span>
                        </div>
                        <button 
                          type="button"
                          className="remove-slot-btn-form" 
                          onClick={() => removeTimeSlotFromForm(slot.slotId)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Time Slot Form */}
                <div className="add-time-slot-form">
                  <div className="time-slot-inputs">
                    <div className="input-group">
                      <label>Start Time</label>
                      <select 
                        value={timeSlotFormData.startTime}
                        onChange={(e) => setTimeSlotFormData({ ...timeSlotFormData, startTime: e.target.value })}
                        className="form-input"
                      >
                        <option value="">Select start time</option>
                        {getAllTimeSlots().map(time => (
                          <option key={time} value={time}>
                            {formatTime12Hour(time)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Duration (hours)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={timeSlotFormData.duration}
                        onChange={(e) => setTimeSlotFormData({ ...timeSlotFormData, duration: Number(e.target.value) })}
                        className="form-input"
                      />
                    </div>
                    <button type="button" onClick={addTimeSlotToForm} className="add-slot-btn-form">
                      Add Slot
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="popup-footer">
              <button onClick={() => setShowCloseConfirmation(true)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleSaveTheater} className="btn-save" disabled={uploadingImage} aria-busy={uploadingImage}>
                {uploadingImage ? 'Saving...' : (editingTheater ? 'Update Theater' : 'Add Theater')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation Popup */}
      {showCloseConfirmation && (
        <div className="popup-overlay">
          <div className="popup-content small-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Confirm Close</h2>
            </div>
            <div className="popup-body">
              <p>Are you sure you want to close this form? All unsaved changes will be lost.</p>
            </div>
            <div className="popup-footer">
              <button onClick={handleCloseCancel} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleCloseConfirm} className="btn-save">
                Yes, Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Delete Theater"
        message="Are you sure you want to delete this theater and all its images?"
        confirmText="Yes, Delete"
        cancelText="No, Keep"
        onConfirm={confirmDeleteTheater}
        onCancel={() => {
          setShowConfirmModal(false);
          setTheaterToDelete(null);
        }}
        type="danger"
      />

      <style jsx>{`
        .theatres-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .capacity-label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #666;
          font-weight: 500;
        }

        .capacity-value {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #333;
          font-weight: 600;
        }

        .time-slots-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #e8f4fd;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .slots-label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #0066cc;
          font-weight: 500;
        }

        .slots-value {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #0066cc;
          font-weight: 600;
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
          background: none;
          border: none;
          color: var(--accent-color);
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.8rem;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }

        .view-full-btn:hover {
          color: var(--accent-hover);
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
          width: 30px;
          z-index: 2;
          pointer-events: none;
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
          background: #2563eb;
        }

        .settings-btn {
          background: #3b82f6;
        }

        .download-btn {
          background: #10b981;
        }

        .download-btn:hover {
          background: #059669;
        }


        .delete-btn {
          background: #ef4444;
        }

        .delete-btn:hover {
          background: #dc2626;
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
          cursor: move;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .included-item:hover {
          background: #dee2e6;
          border-color: #6c757d;
          transform: scale(1.02);
        }

        .included-item:active {
          opacity: 0.5;
        }

        .item-number {
          font-weight: bold;
          color: #495057;
          min-width: 25px;
        }

        .item-text {
          flex: 1;
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
          transition: transform 0.2s ease;
        }

        .remove-item-btn:hover {
          transform: scale(1.2);
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

        /* Multiple Images Styles */
        .multiple-upload {
          border: 2px dashed #10b981;
          background: #f0fdf4;
        }

        .multiple-upload:hover {
          border-color: #059669;
          background: #ecfdf5;
        }

        .existing-images-section,
        .new-images-section {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .existing-images-section h4,
        .new-images-section h4 {
          margin: 0 0 0.75rem 0;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #374151;
        }

        .images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }

        .image-preview-container.small {
          width: 120px;
          height: 120px;
          padding: 0.5rem;
        }

        .image-preview-container.small .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }

        .image-preview-container.small .remove-image-btn {
          top: 0.75rem;
          right: 0.75rem;
          width: 20px;
          height: 20px;
          font-size: 0.8rem;
        }

        /* Unified Upload Styles */
        .unified-upload {
          border: 2px dashed #3b82f6;
          background: #eff6ff;
        }

        .unified-upload:hover {
          border-color: #2563eb;
          background: #dbeafe;
        }

        .images-preview-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .main-image-preview h4,
        .multiple-images-preview h4 {
          margin: 0 0 0.75rem 0;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #374151;
        }

        /* Image Label Styles */
        .image-label {
          position: absolute;
          bottom: 0.5rem;
          left: 0.5rem;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
        }

        .image-label.existing {
          background: rgba(34, 197, 94, 0.9);
          color: white;
        }

        .image-label.new {
          background: rgba(59, 130, 246, 0.9);
          color: white;
        }

        .add-more-images-btn {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #10b981;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          text-align: center;
          transition: background 0.2s ease;
          border: none;
          margin-top: 1rem;
        }

        .add-more-images-btn:hover {
          background: #059669;
        }

        .add-more-images-btn input {
          display: none;
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

        /* Time Slots Form Styles */
        .time-slots-list {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .empty-slots-message {
          text-align: center;
          color: #666;
          font-style: italic;
        }

        .empty-slots-message p {
          margin: 0;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
        }

        .time-slot-item-form {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          background: white;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .time-slot-item-form:last-child {
          margin-bottom: 0;
        }

        .slot-time-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .slot-time-text {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-weight: 600;
          color: #333;
          font-size: 0.9rem;
        }

        .slot-duration-text {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          color: #666;
          font-size: 0.8rem;
        }

        .remove-slot-btn-form {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 1rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-slot-btn-form:hover {
          background: #c82333;
        }

        .add-time-slot-form {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          border: 2px dashed #d1d5db;
        }

        .time-slot-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 1rem;
          align-items: end;
        }

        .input-group {
          display: flex;
          flex-direction: column;
        }

        .input-group label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .add-slot-btn-form {
          padding: 0.75rem 1.5rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          white-space: nowrap;
          height: fit-content;
        }

        .add-slot-btn-form:hover {
          background: #059669;
        }

        /* Theater Type Badge Styles */
        .theatre-type {
          margin: 0.5rem 0;
        }

        .type-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #FF0005 0%, #ff4444 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(255, 0, 5, 0.3);
        }

        /* Different colors for different theater types */
        .type-badge:contains("VIP") {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          color: #1a1a1a;
          box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
        }

        .type-badge:contains("Premium") {
          background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .type-badge:contains("Standard") {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .type-badge:contains("Family") {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
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

          .time-slot-inputs {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .add-slot-btn-form {
            width: 100%;
          }
        }

        /* Drag and Drop Styles */
        .theatre-card {
          position: relative;
          cursor: grab;
          transition: all 0.2s ease;
        }

        .theatre-card:active {
          cursor: grabbing;
        }

        .theatre-card.dragging {
          opacity: 0.5;
          transform: rotate(2deg);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }

        .theatre-card.drag-over {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.3);
          border: 2px solid #3b82f6;
        }

        .drag-handle {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: grab;
          z-index: 10;
          transition: all 0.2s ease;
        }

        .drag-handle:hover {
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .position-indicator {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.75rem;
          font-weight: bold;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          min-width: 24px;
          text-align: center;
        }

        .drag-handle svg {
          color: #6b7280;
          opacity: 0.7;
        }

        .theatre-card:hover .drag-handle {
          opacity: 1;
        }

        .theatre-card:not(:hover) .drag-handle {
          opacity: 0.8;
        }

        /* Decoration Toggle Styles */
        .decoration-toggle-section {
          margin: 0.75rem 0;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          user-select: none;
        }

        .toggle-container input[type="checkbox"] {
          position: relative;
          width: 44px;
          height: 24px;
          appearance: none;
          background: #cbd5e1;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .toggle-container input[type="checkbox"]:checked {
          background: #10b981;
        }

        .toggle-container input[type="checkbox"]::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          top: 3px;
          left: 3px;
          transition: transform 0.3s ease;
        }

        .toggle-container input[type="checkbox"]:checked::before {
          transform: translateX(20px);
        }

        .toggle-label {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: #374151;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
