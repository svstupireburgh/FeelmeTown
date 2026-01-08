'use client';

import { useState, useEffect } from 'react';
import { Clock, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';

interface TimeSlot {
  _id?: string;
  slotId?: string;
  theaterName?: string;
  startTime: string;
  endTime: string;
  duration: number;
  isActive: boolean;
  createdAt?: string;
}

export default function TimeSlotsPage() {
  const { showSuccess, showError, toasts, removeToast } = useToast();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null);
  
  const [editFormData, setEditFormData] = useState({
    startTime: '',
    duration: 3
  });
  
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    duration: 3
  });

  // Fetch time slots from database
  const fetchTimeSlots = async (showLoadingScreen = true) => {
    try {
      if (showLoadingScreen) {
        setLoading(true);
      }
      const response = await fetch('/api/admin/time-slots');
      const data = await response.json();
      
      if (data.success) {
        setTimeSlots(data.timeSlots || []);
      } else {
        
      }
    } catch (error) {
      
    } finally {
      if (showLoadingScreen) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationHours: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (durationHours * 60);
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  // Format time to 12-hour format with AM/PM
  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const endTime = calculateEndTime(formData.startTime, formData.duration);
    
    const timeSlotData = {
      startTime: formData.startTime,
      endTime: endTime,
      duration: formData.duration,
      isActive: true
    };

    try {
      const response = await fetch('/api/admin/time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeSlotData)
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTimeSlots(false);
        setIsAddingNew(false);
        setFormData({ startTime: '', endTime: '', duration: 3 });
        showSuccess('Time slot added successfully!');
      } else {
        showError('Failed to add time slot: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      
      showError('Error adding time slot');
    }
  };

  // Show delete confirmation popup
  const handleDeleteClick = (slot: TimeSlot) => {
    setSlotToDelete(slot);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!slotToDelete) return;

    try {
      const response = await fetch(`/api/admin/time-slots?slotId=${slotToDelete.slotId || slotToDelete._id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTimeSlots(false);
        showSuccess('Time slot deleted successfully!');
        setShowDeleteConfirm(false);
        setSlotToDelete(null);
      } else {
        showError('Failed to delete time slot: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      
      showError('Error deleting time slot');
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSlotToDelete(null);
  };

  // Handle edit click
  const handleEditClick = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setEditFormData({
      startTime: slot.startTime,
      duration: slot.duration
    });
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingSlot) return;

    const endTime = calculateEndTime(editFormData.startTime, editFormData.duration);
    
    try {
      const response = await fetch('/api/admin/time-slots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: editingSlot.slotId,
          startTime: editFormData.startTime,
          endTime: endTime,
          duration: editFormData.duration
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTimeSlots(false);
        setEditingSlot(null);
        showSuccess('Time slot updated successfully!');
      } else {
        showError('Failed to update time slot: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      
      showError('Error updating time slot');
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingSlot(null);
    setEditFormData({ startTime: '', duration: 3 });
  };

  // Handle toggle active status
  const handleToggleActive = async (slot: TimeSlot) => {
    try {
      const response = await fetch('/api/admin/time-slots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.slotId,
          isActive: !slot.isActive
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTimeSlots(false);
        showSuccess(`Time slot ${slot.isActive ? 'deactivated' : 'activated'} successfully!`);
      } else {
        showError('Failed to update time slot: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      
      showError('Error updating time slot');
    }
  };

  if (loading) {
    return (
      <div className="time-slots-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          Loading time slots...
        </div>
      </div>
    );
  }

  return (
    <div className="time-slots-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Time Slots Management</h1>
            <p>Manage theater booking time slots (3-hour duration)</p>
          </div>
          <button className="add-btn" onClick={() => setIsAddingNew(true)}>
            <Plus size={20} />
            Add New Slot
          </button>
        </div>
      </div>

      {/* Add New Time Slot Form */}
      {isAddingNew && (
        <div className="form-card">
          <div className="form-header">
            <h2>Add New Time Slot</h2>
            <button className="close-btn" onClick={() => setIsAddingNew(false)}>
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Start Time</label>
                <select
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                >
                  <option value="">Select Time</option>
                  <option value="00:00">12:00 AM</option>
                  <option value="00:30">12:30 AM</option>
                  <option value="01:00">01:00 AM</option>
                  <option value="01:30">01:30 AM</option>
                  <option value="02:00">02:00 AM</option>
                  <option value="02:30">02:30 AM</option>
                  <option value="03:00">03:00 AM</option>
                  <option value="03:30">03:30 AM</option>
                  <option value="04:00">04:00 AM</option>
                  <option value="04:30">04:30 AM</option>
                  <option value="05:00">05:00 AM</option>
                  <option value="05:30">05:30 AM</option>
                  <option value="06:00">06:00 AM</option>
                  <option value="06:30">06:30 AM</option>
                  <option value="07:00">07:00 AM</option>
                  <option value="07:30">07:30 AM</option>
                  <option value="08:00">08:00 AM</option>
                  <option value="08:30">08:30 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="09:30">09:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="12:30">12:30 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="13:30">01:30 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="14:30">02:30 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="15:30">03:30 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="16:30">04:30 PM</option>
                  <option value="17:00">05:00 PM</option>
                  <option value="17:30">05:30 PM</option>
                  <option value="18:00">06:00 PM</option>
                  <option value="18:30">06:30 PM</option>
                  <option value="19:00">07:00 PM</option>
                  <option value="19:30">07:30 PM</option>
                  <option value="20:00">08:00 PM</option>
                  <option value="20:30">08:30 PM</option>
                  <option value="21:00">09:00 PM</option>
                  <option value="21:30">09:30 PM</option>
                  <option value="22:00">10:00 PM</option>
                  <option value="22:30">10:30 PM</option>
                  <option value="23:00">11:00 PM</option>
                  <option value="23:30">11:30 PM</option>
                </select>
              </div>
              <div className="form-group">
                <label>Duration (Hours)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  min="1"
                  max="6"
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time (Auto-calculated)</label>
                <input
                  type="text"
                  value={formData.startTime ? formatTime12Hour(calculateEndTime(formData.startTime, formData.duration)) : ''}
                  disabled
                  style={{ background: '#F3F4F6', cursor: 'not-allowed' }}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn">
                <Save size={16} />
                Save Time Slot
              </button>
              <button type="button" className="cancel-btn" onClick={() => setIsAddingNew(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Time Slots List */}
      <div className="slots-grid">
        {timeSlots.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} />
            <p>No time slots found</p>
            <button className="add-btn" onClick={() => setIsAddingNew(true)}>
              Add First Time Slot
            </button>
          </div>
        ) : (
          timeSlots.map((slot) => {
            const isEditing = editingSlot?.slotId === slot.slotId;
            
            return (
              <div key={slot._id || slot.slotId} className={`slot-card ${!slot.isActive ? 'inactive' : ''} ${isEditing ? 'editing' : ''}`}>
                <div className="slot-header">
                  <Clock size={24} />
                  <span className={`status-badge ${slot.isActive ? 'active' : 'inactive'}`}>
                    {slot.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {isEditing ? (
                  <div className="edit-form">
                    <div className="edit-field">
                      <label>Start Time</label>
                      <select
                        value={editFormData.startTime}
                        onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                      >
                        <option value="">Select Time</option>
                        <option value="00:00">12:00 AM</option>
                        <option value="00:30">12:30 AM</option>
                        <option value="01:00">01:00 AM</option>
                        <option value="01:30">01:30 AM</option>
                        <option value="02:00">02:00 AM</option>
                        <option value="02:30">02:30 AM</option>
                        <option value="03:00">03:00 AM</option>
                        <option value="03:30">03:30 AM</option>
                        <option value="04:00">04:00 AM</option>
                        <option value="04:30">04:30 AM</option>
                        <option value="05:00">05:00 AM</option>
                        <option value="05:30">05:30 AM</option>
                        <option value="06:00">06:00 AM</option>
                        <option value="06:30">06:30 AM</option>
                        <option value="07:00">07:00 AM</option>
                        <option value="07:30">07:30 AM</option>
                        <option value="08:00">08:00 AM</option>
                        <option value="08:30">08:30 AM</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="09:30">09:30 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="10:30">10:30 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="11:30">11:30 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="12:30">12:30 PM</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="13:30">01:30 PM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="14:30">02:30 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="15:30">03:30 PM</option>
                        <option value="16:00">04:00 PM</option>
                        <option value="16:30">04:30 PM</option>
                        <option value="17:00">05:00 PM</option>
                        <option value="17:30">05:30 PM</option>
                        <option value="18:00">06:00 PM</option>
                        <option value="18:30">06:30 PM</option>
                        <option value="19:00">07:00 PM</option>
                        <option value="19:30">07:30 PM</option>
                        <option value="20:00">08:00 PM</option>
                        <option value="20:30">08:30 PM</option>
                        <option value="21:00">09:00 PM</option>
                        <option value="21:30">09:30 PM</option>
                        <option value="22:00">10:00 PM</option>
                        <option value="22:30">10:30 PM</option>
                        <option value="23:00">11:00 PM</option>
                        <option value="23:30">11:30 PM</option>
                      </select>
                    </div>
                    <div className="edit-field">
                      <label>Duration (Hours)</label>
                      <input
                        type="number"
                        value={editFormData.duration}
                        onChange={(e) => setEditFormData({ ...editFormData, duration: parseInt(e.target.value) })}
                        min="1"
                        max="6"
                      />
                    </div>
                    <div className="edit-field">
                      <label>End Time</label>
                      <input
                        type="text"
                        value={editFormData.startTime ? formatTime12Hour(calculateEndTime(editFormData.startTime, editFormData.duration)) : ''}
                        disabled
                        style={{ background: '#F3F4F6' }}
                      />
                    </div>
                    <div className="edit-actions">
                      <button className="save-edit-btn" onClick={handleSaveEdit}>
                        <Save size={16} />
                        Save
                      </button>
                      <button className="cancel-edit-btn" onClick={handleCancelEdit}>
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="slot-time">
                      <div className="time-display">
                        <span className="time">{formatTime12Hour(slot.startTime)}</span>
                        <span className="separator">-</span>
                        <span className="time">{formatTime12Hour(slot.endTime)}</span>
                      </div>
                      <div className="duration">
                        Duration: {slot.duration} hours
                      </div>
                    </div>
                    <div className="slot-actions">
                      <div className="toggle-container">
                        <span className="toggle-label">Status:</span>
                        <button
                          className={`toggle-switch ${slot.isActive ? 'active' : ''}`}
                          onClick={() => handleToggleActive(slot)}
                          title={slot.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <span className="toggle-slider"></span>
                        </button>
                      </div>
                      <div className="action-buttons-group">
                        <button
                          className="edit-icon-btn"
                          onClick={() => handleEditClick(slot)}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteClick(slot)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        .time-slots-page {
          padding: 2rem;
          background-color: #F9FAFB;
          min-height: calc(100vh - 60px);
        }

        .page-header {
          margin-bottom: 2rem;
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-text h1 {
          color: #8B5CF6;
          margin: 0 0 0.5rem 0;
          font-size: 1.875rem;
          font-weight: 700;
        }

        .header-text p {
          color: #6B7280;
          margin: 0;
        }

        .add-btn {
          background: #10B981;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.2s;
        }

        .add-btn:hover {
          background: #059669;
        }

        .form-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          margin-bottom: 2rem;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .form-header h2 {
          color: #374151;
          margin: 0;
          font-size: 1.25rem;
        }

        .close-btn {
          background: none;
          border: none;
          color: #6B7280;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: #F3F4F6;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #000000 !important;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select {
          padding: 0.75rem;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          color: #000000;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #8B5CF6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .submit-btn {
          background: #8B5CF6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.2s;
        }

        .submit-btn:hover {
          background: #7C3AED;
        }

        .cancel-btn {
          background: #E5E7EB;
          color: #374151;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .cancel-btn:hover {
          background: #D1D5DB;
        }

        .slots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .empty-state svg {
          color: #9CA3AF;
          margin-bottom: 1rem;
        }

        .empty-state p {
          color: #6B7280;
          font-size: 1.125rem;
          margin-bottom: 1.5rem;
        }

        .slot-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 250, 0.9) 100%);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 
            0 8px 16px rgba(0, 0, 0, 0.08),
            0 2px 4px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(229, 231, 235, 0.8);
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .slot-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          background: linear-gradient(180deg, #10B981 0%, #059669 100%);
          box-shadow: 2px 0 8px rgba(16, 185, 129, 0.4);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .slot-card::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.03) 0%, transparent 70%);
          pointer-events: none;
          transition: all 0.4s ease;
        }

        .slot-card.inactive::before {
          background: linear-gradient(180deg, #EF4444 0%, #DC2626 100%);
          box-shadow: 2px 0 8px rgba(239, 68, 68, 0.4);
        }

        .slot-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 
            0 20px 40px rgba(139, 92, 246, 0.2),
            0 8px 16px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .slot-card:hover::before {
          width: 8px;
          box-shadow: 3px 0 12px rgba(16, 185, 129, 0.6);
        }

        .slot-card:hover::after {
          top: -30%;
          right: -30%;
        }

        .slot-card.inactive {
          opacity: 0.88;
        }

        .slot-card.inactive:hover {
          opacity: 1;
        }

        .slot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          
        }

        .slot-header svg {
          color: #8B5CF6;
          filter: drop-shadow(0 2px 6px rgba(139, 92, 246, 0.3));
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 2px 6px rgba(139, 92, 246, 0.3));
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 4px 8px rgba(139, 92, 246, 0.5));
          }
        }

        .status-badge {
          padding: 0.375rem 1rem;
          border-radius: 24px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .status-badge.active {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
        }

        .status-badge.inactive {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: white;
        }

        .slot-time {
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.03);
        }

        .time-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          margin-bottom: 0.875rem;
        }

        .time {
          font-size: 1rem;
          font-weight: 900;
          color:rgb(65, 65, 65) !important;
         
          
          letter-spacing: -0.5px;
        }

        .separator {
          color: #8B5CF6;
          font-weight: 600;
          font-size: 1.5rem;
        }

        .duration {
          color: #6B7280;
          font-size: 0.875rem;
          text-align: center;
          font-weight: 600;
          background: rgba(139, 92, 246, 0.08);
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          display: inline-block;
        }

        .slot-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #E5E7EB;
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .toggle-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .action-buttons-group {
          display: flex;
          gap: 0.375rem;
        }

        .toggle-switch {
          position: relative;
          width: 56px;
          height: 30px;
          background: linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%);
          border: 2px solid #E5E7EB;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0;
          overflow: visible;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .toggle-switch.active {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-color: #10B981;
          box-shadow: 
            inset 0 2px 4px rgba(0, 0, 0, 0.1),
            0 0 0 4px rgba(16, 185, 129, 0.15);
        }

        .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 22px;
          height: 22px;
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          border-radius: 50%;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            0 2px 6px rgba(0, 0, 0, 0.2),
            0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .toggle-switch.active .toggle-slider {
          transform: translateX(26px);
          box-shadow: 
            0 3px 8px rgba(16, 185, 129, 0.4),
            0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch:hover {
          box-shadow: 
            inset 0 2px 4px rgba(0, 0, 0, 0.1),
            0 0 0 6px rgba(139, 92, 246, 0.12);
          transform: scale(1.05);
        }

        .toggle-switch.active:hover {
          box-shadow: 
            inset 0 2px 4px rgba(0, 0, 0, 0.1),
            0 0 0 6px rgba(16, 185, 129, 0.2);
        }

        .delete-btn {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: white;
          border: 2px solid rgba(239, 68, 68, 0.3);
          padding: 0.625rem 0.875rem;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            0 4px 6px rgba(239, 68, 68, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
          overflow: hidden;
        }

        .delete-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.4s, height 0.4s;
        }

        .delete-btn:hover::before {
          width: 120%;
          height: 120%;
        }

        .delete-btn:hover {
          transform: scale(1.08) rotate(-2deg);
          box-shadow: 
            0 8px 16px rgba(239, 68, 68, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          border-color: rgba(239, 68, 68, 0.5);
        }

        .delete-btn svg {
          position: relative;
          z-index: 1;
        }

        .slot-card.editing {
          border-color: #8B5CF6;
          box-shadow: 
            0 8px 16px rgba(139, 92, 246, 0.15),
            0 0 0 4px rgba(139, 92, 246, 0.1);
        }

        .edit-icon-btn {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
          color: white;
          border: none;
          margin-left: 2rem;
          padding: 0.625rem 0.875rem;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
        }

        .edit-icon-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .edit-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .edit-field label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #000000 !important;
        }

        .edit-field input,
        .edit-field select {
          padding: 0.75rem;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          color: #000000;
        }

        .edit-field input:focus,
        .edit-field select:focus {
          outline: none;
          border-color: #8B5CF6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .edit-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .save-edit-btn {
          flex: 1;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }

        .save-edit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .cancel-edit-btn {
          flex: 1;
          background: white;
          color: #374151;
          border: 2px solid #E5E7EB;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .cancel-edit-btn:hover {
          background: #F3F4F6;
          border-color: #D1D5DB;
        }

        .confirmation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .confirmation-modal {
          background: white;
          padding: 2.5rem;
          border-radius: 20px;
          max-width: 450px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .confirmation-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #EF4444;
        }

        .confirmation-modal h2 {
          color: #1F2937;
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .confirmation-modal p {
          color: #6B7280;
          margin: 0 0 1rem 0;
          font-size: 1rem;
          line-height: 1.6;
        }

        .confirmation-modal strong {
          color: #8B5CF6;
          font-weight: 700;
        }

        .warning-text {
          color: #EF4444;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 2rem;
        }

        .confirmation-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .confirm-delete-btn {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: white;
          border: none;
          padding: 0.875rem 1.75rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .confirm-delete-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
        }

        .cancel-delete-btn {
          background: white;
          color: #374151;
          border: 2px solid #E5E7EB;
          padding: 0.875rem 1.75rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-delete-btn:hover {
          background: #F3F4F6;
          border-color: #D1D5DB;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .time-slots-page {
            padding: 1rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .slots-grid {
            grid-template-columns: 1fr;
          }

          .time {
            font-size: 1.25rem;
          }

          .confirmation-modal {
            padding: 2rem;
            width: 95%;
          }

          .confirmation-actions {
            flex-direction: column;
          }

          .confirm-delete-btn,
          .cancel-delete-btn {
            width: 100%;
          }
        }
      `}</style>

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && slotToDelete && (
        <div className="confirmation-overlay" onClick={cancelDelete}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirmation-icon">
              <Trash2 size={48} />
            </div>
            <h2>Delete Time Slot?</h2>
            <p>
              Are you sure you want to delete the time slot<br />
              <strong>{formatTime12Hour(slotToDelete.startTime)} - {formatTime12Hour(slotToDelete.endTime)}</strong>?
            </p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="confirmation-actions">
              <button className="confirm-delete-btn" onClick={confirmDelete}>
                <Trash2 size={16} />
                Yes, Delete
              </button>
              <button className="cancel-delete-btn" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}


