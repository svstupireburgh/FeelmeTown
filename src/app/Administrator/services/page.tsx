'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  imageUrl: string;
  price?: number;
  // Pricing mode: single price, half/full, or three-size (small/medium/full)
  pricingMode?: 'single' | 'half-full' | 'three-size';
  halfPrice?: number;
  fullPrice?: number;
  smallPrice?: number;
  mediumPrice?: number;
  largePrice?: number;
  // Simple text category (e.g. Starters, Main Course)
  categoryName?: string;
  showTag?: boolean; // Individual item tag toggle
  vegType?: 'veg' | 'non-veg';
}

interface Service {
  _id?: string;
  serviceId: string;
  name: string;
  items: ServiceItem[];
  isActive: boolean;
  includeInDecoration?: boolean;
  compulsory?: boolean;
  itemTagName?: string; // Name for the tag (e.g., "Popular", "Recommended", "Bestseller")
  itemTagEnabled?: boolean; // Whether to show tags on items
  showInBookingPopup?: boolean;
  createdAt?: Date;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddServicePopup, setShowAddServicePopup] = useState(false);
  const [showAddItemPopup, setShowAddItemPopup] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [openSettingsPanels, setOpenSettingsPanels] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; type?: 'service' | 'item'; serviceId?: string; service?: Service; itemId?: string }>({ show: false });
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');

  const [serviceName, setServiceName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemPricingMode, setItemPricingMode] = useState<'single' | 'half-full' | 'three-size'>('single');
  const [itemHalfPrice, setItemHalfPrice] = useState('');
  const [itemFullPrice, setItemFullPrice] = useState('');
  const [itemSmallPrice, setItemSmallPrice] = useState('');
  const [itemMediumPrice, setItemMediumPrice] = useState('');
  const [itemLargePrice, setItemLargePrice] = useState('');
  const [itemCategoryName, setItemCategoryName] = useState('');
  const [itemVegType, setItemVegType] = useState<'veg' | 'non-veg'>('veg');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [savingTagName, setSavingTagName] = useState<string | null>(null);
  const [savedTagNames, setSavedTagNames] = useState<Set<string>>(new Set());
  const [editingTagName, setEditingTagName] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const isFoodServiceName = (name?: string) => {
    const v = String(name || '').toLowerCase();
    return /(food|menu|snack|beverage|drink|starter|main\s*course|dessert|catering)/i.test(v);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast({
        type: type,
        message: message,
        duration: 3000
      });
    }
  };

  const handleVegTypeChange = async (service: Service, itemId: string, nextType: 'veg' | 'non-veg') => {
    try {
      const updatedItems = service.items.map((item) =>
        item.id === itemId ? { ...item, vegType: nextType } : item
      );

      setServices((prevServices) =>
        prevServices.map((s) =>
          s._id === service._id ? { ...s, items: updatedItems } : s
        )
      );

      const response = await fetch(`/api/admin/services?id=${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems })
      });

      const data = await response.json();

      if (data.success) {
        showToast(`Marked ${updatedItems.find((item) => item.id === itemId)?.name || 'item'} as ${nextType === 'veg' ? 'Veg' : 'Non Veg'}`, 'success');
      } else {
        throw new Error(data.error || 'Failed to update veg type');
      }
    } catch (error) {
      console.error('🥗 Veg type toggle error:', error);
      showToast('Failed to update veg type', 'error');
      // revert on failure
      setServices((prevServices) =>
        prevServices.map((s) =>
          s._id === service._id ? { ...s, items: service.items } : s
        )
      );
    }
  };

  // Helper function to check if service has existing tag name from database
  const hasExistingTagName = (service: Service) => {
    // Check if this service has a saved tag name in database
    return savedTagNames.has(service._id!);
  };

  const fetchServices = async () => {
    try {
      // Fetch all services including inactive ones for admin panel
      const response = await fetch('/api/admin/services?includeInactive=true');
      const data = await response.json();

      if (data.success) {
        console.log('📦 Admin fetched all services:', data.services);

        // Normalize services to ensure all toggle fields exist
        const normalizedServices = data.services.map((service: any) => ({
          ...service,
          includeInDecoration: service.includeInDecoration ?? false,
          compulsory: service.compulsory ?? false,
          itemTagName: service.itemTagName ?? '', // No default, use database value
          itemTagEnabled: service.itemTagEnabled ?? false,
          showInBookingPopup: service.showInBookingPopup ?? true,
          items: (service.items || []).map((item: any) => ({
            ...item,
            showTag: item.showTag ?? false,
            vegType: isFoodServiceName(service.name) ? (item.vegType ?? 'veg') : undefined
          }))
        }));

        setServices(normalizedServices);

        // Build shared category list from all items
        const categorySet = new Set<string>();
        normalizedServices.forEach((svc: Service) => {
          (svc.items || []).forEach((item) => {
            if (item.categoryName && item.categoryName.trim()) {
              categorySet.add(item.categoryName.trim());
            }
          });
        });
        setAllCategories(Array.from(categorySet).sort());

        // Track which services have existing tag names from database
        const servicesWithTagNames = new Set<string>();
        normalizedServices.forEach((service: Service) => {
          if (service.itemTagName?.trim()) {
            servicesWithTagNames.add(service._id!);
          }
        });
        setSavedTagNames(servicesWithTagNames);
      }
    } catch (error) {

      showToast('Failed to fetch services', 'error');
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
    formData.append('upload_preset', 'FMTServices');
    formData.append('folder', 'feelmetown/services');

    const cloudName = await getCloudinaryCloudName();
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    return data.secure_url;
  };

  const handleAddService = () => {
    setEditingService(null);
    setServiceName('');
    setShowAddServicePopup(true);
  };

  const handleSaveService = async () => {
    if (!serviceName.trim()) {
      showToast('Please enter service name', 'error');
      return;
    }

    try {
      if (editingService) {
        // Update existing service
        const response = await fetch(`/api/admin/services?id=${editingService._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: serviceName.trim() })
        });

        const data = await response.json();

        if (data.success) {
          showToast('Service updated successfully!', 'success');
          setShowAddServicePopup(false);
          setServiceName('');
          setEditingService(null);
          fetchServices();
        } else {
          showToast(data.error || 'Failed to update service', 'error');
        }
      } else {
        // Add new service
        const serviceData = {
          name: serviceName.trim(),
          items: []
        };

        const response = await fetch('/api/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData)
        });

        const data = await response.json();

        if (data.success) {
          showToast('Service added successfully!', 'success');
          setShowAddServicePopup(false);
          setServiceName('');
          fetchServices();
        } else {
          showToast(data.error || 'Failed to add service', 'error');
        }
      }
    } catch (error) {

      showToast('Failed to save service', 'error');
    }
  };

  const handleAddItemClick = (service: Service) => {
    setSelectedService(service);
    setItemName('');
    setItemPrice('');
    setItemPricingMode('single');
    setItemHalfPrice('');
    setItemFullPrice('');
    setItemSmallPrice('');
    setItemMediumPrice('');
    setItemLargePrice('');

    // If categories already exist, default to the first one so the item
    // actually gets that category even if the user doesn't touch the dropdown.
    const defaultCategory = allCategories.length > 0 ? allCategories[0] : '';
    setItemCategoryName(defaultCategory);

    setImagePreview('');
    setSelectedImageFile(null);
    if (isFoodServiceName(service.name)) {
      setItemVegType('veg');
    }
    setShowAddItemPopup(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      showToast('Please enter item name', 'error');
      return;
    }

    if (!selectedImageFile) {
      showToast('Please select an image', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadImageToCloudinary(selectedImageFile);

      // Resolve pricing based on selected mode
      let resolvedPrice: number | undefined = undefined;
      let halfPrice: number | undefined = undefined;
      let fullPrice: number | undefined = undefined;
      let smallPrice: number | undefined = undefined;
      let mediumPrice: number | undefined = undefined;
      let largePrice: number | undefined = undefined;

      if (itemPricingMode === 'half-full') {
        halfPrice = itemHalfPrice ? parseFloat(itemHalfPrice) : undefined;
        fullPrice = itemFullPrice ? parseFloat(itemFullPrice) : undefined;
        resolvedPrice = fullPrice ?? halfPrice;
      } else if (itemPricingMode === 'three-size') {
        smallPrice = itemSmallPrice ? parseFloat(itemSmallPrice) : undefined;
        mediumPrice = itemMediumPrice ? parseFloat(itemMediumPrice) : undefined;
        largePrice = itemLargePrice ? parseFloat(itemLargePrice) : undefined;
        // Use large > medium > small as fallback for the base price
        resolvedPrice = largePrice ?? mediumPrice ?? smallPrice;
      } else {
        resolvedPrice = itemPrice ? parseFloat(itemPrice) : undefined;
      }

      const newItem: ServiceItem = {
        id: `ITEM${Date.now()}`,
        name: itemName.trim(),
        imageUrl: imageUrl,
        price: resolvedPrice,
        pricingMode: itemPricingMode,
        halfPrice,
        fullPrice,
        smallPrice,
        mediumPrice,
        largePrice,
        categoryName: itemCategoryName.trim() || undefined,
        showTag: false, // Default to no tag for new items
        ...(isFoodServiceName(selectedService?.name) ? { vegType: itemVegType } : {})
      };

      const updatedItems = [...(selectedService?.items || []), newItem];

      const response = await fetch(`/api/admin/services?id=${selectedService?._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Item added successfully!', 'success');
        setShowAddItemPopup(false);
        setItemName('');
        setItemPrice('');
        setItemPricingMode('single');
        setItemHalfPrice('');
        setItemFullPrice('');
        setItemSmallPrice('');
        setItemMediumPrice('');
        setItemLargePrice('');
        setItemCategoryName('');
        setImagePreview('');
        setSelectedImageFile(null);
        setItemVegType('veg');
        fetchServices();
      } else {
        showToast(data.error || 'Failed to add item', 'error');
      }
    } catch (error) {

      showToast('Failed to save item', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteServiceClick = (id: string) => {
    setDeleteConfirm({ show: true, type: 'service', serviceId: id });
  };

  const handleDeleteItemClick = (service: Service, itemId: string) => {
    setDeleteConfirm({ show: true, type: 'item', service: service, itemId: itemId });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm.type === 'service' && deleteConfirm.serviceId) {
      await deleteService(deleteConfirm.serviceId);
    } else if (deleteConfirm.type === 'item' && deleteConfirm.service && deleteConfirm.itemId) {
      await deleteItem(deleteConfirm.service, deleteConfirm.itemId);
    }
    setDeleteConfirm({ show: false });
  };

  const deleteService = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/services?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showToast('Service deleted successfully!', 'success');
        fetchServices();
      } else {
        showToast(data.error || 'Failed to delete service', 'error');
      }
    } catch (error) {

      showToast('Failed to delete service', 'error');
    }
  };

  const deleteItem = async (service: Service, itemId: string) => {
    try {
      // Find the item to get its image URL
      const itemToDelete = service.items.find(item => item.id === itemId);

      // Delete from Cloudinary if image exists
      if (itemToDelete?.imageUrl) {
        try {
          await fetch('/api/admin/delete-cloudinary-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: itemToDelete.imageUrl })
          });
        } catch (error) {

        }
      }

      const updatedItems = service.items.filter(item => item.id !== itemId);

      const response = await fetch(`/api/admin/services?id=${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Item deleted successfully!', 'success');
        fetchServices();
      } else {
        showToast(data.error || 'Failed to delete item', 'error');
      }
    } catch (error) {

      showToast('Failed to delete item', 'error');
    }
  };

  const toggleExpand = (serviceId: string) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const handleEditServiceClick = (service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setShowAddServicePopup(true);
  };

  const toggleSettingsPanel = (serviceId: string) => {
    setOpenSettingsPanels((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const handleToggleShowInBooking = async (service: Service) => {
    try {
      const currentValue = service.showInBookingPopup ?? true;
      const newValue = !currentValue;

      setServices((prev) =>
        prev.map((s) =>
          s._id === service._id
            ? { ...s, showInBookingPopup: newValue }
            : s,
        ),
      );

      const response = await fetch(`/api/admin/services?id=${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showInBookingPopup: newValue }),
      });

      const data = await response.json();
      if (data.success) {
        showToast(
          `Service will ${newValue ? '' : 'not '}show in booking popup`,
          'success',
        );
        fetchServices();
      } else {
        setServices((prev) =>
          prev.map((s) =>
            s._id === service._id
              ? { ...s, showInBookingPopup: currentValue }
              : s,
          ),
        );
        showToast(data.error || 'Failed to update service', 'error');
      }
    } catch (error) {
      setServices((prev) =>
        prev.map((s) =>
          s._id === service._id
            ? { ...s, showInBookingPopup: service.showInBookingPopup }
            : s,
        ),
      );
      showToast('Failed to update service', 'error');
    }
  };

  const handleToggleDecoration = async (service: Service) => {
    try {
      const newValue = !service.includeInDecoration;
      console.log(`🎨 Toggling includeInDecoration for ${service.name}:`, {
        currentValue: service.includeInDecoration,
        newValue: newValue,
        serviceId: service._id
      });

      // Optimistic UI update
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, includeInDecoration: newValue }
            : s
        )
      );

      const response = await fetch(`/api/admin/services?id=${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeInDecoration: newValue })
      });

      const data = await response.json();
      console.log('🎨 Toggle response:', data);

      if (data.success) {
        showToast(`Service ${newValue ? 'included in' : 'removed from'} decoration`, 'success');
        fetchServices(); // Refresh to ensure sync
      } else {
        // Revert on error
        setServices(prevServices =>
          prevServices.map(s =>
            s._id === service._id
              ? { ...s, includeInDecoration: !newValue }
              : s
          )
        );
        showToast(data.error || 'Failed to update service', 'error');
      }
    } catch (error) {
      console.error('🎨 Toggle error:', error);
      // Revert on error
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, includeInDecoration: service.includeInDecoration }
            : s
        )
      );
      showToast('Failed to update service', 'error');
    }
  };

  const handleToggleCompulsory = async (service: Service) => {
    try {
      // Handle undefined by treating it as false
      const currentValue = service.compulsory ?? false;
      const newValue = !currentValue;
      console.log(`🔒 Toggling compulsory for ${service.name}:`, {
        currentValue: currentValue,
        newValue: newValue,
        serviceId: service._id
      });

      // Optimistic UI update
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, compulsory: newValue }
            : s
        )
      );

      console.log('🔒 Sending request to:', `/api/admin/services?id=${service._id}`);
      console.log('🔒 Request body:', { compulsory: newValue });

      const response = await fetch(`/api/admin/services?id=${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compulsory: newValue })
      });

      console.log('🔒 Response status:', response.status);
      const data = await response.json();
      console.log('🔒 Toggle response:', data);

      if (data.success) {
        showToast(`Service ${newValue ? 'marked as' : 'removed from'} compulsory`, 'success');
        fetchServices(); // Refresh to ensure sync
      } else {
        // Revert on error
        setServices(prevServices =>
          prevServices.map(s =>
            s._id === service._id
              ? { ...s, compulsory: !newValue }
              : s
          )
        );
        showToast(data.error || 'Failed to update service', 'error');
      }
    } catch (error) {
      console.error('🔒 Toggle error:', error);
      // Revert on error
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, compulsory: service.compulsory }
            : s
        )
      );
      showToast('Failed to update service', 'error');
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const newValue = !service.isActive;
      console.log(`⚡ Toggling isActive for ${service.name}:`, {
        currentValue: service.isActive,
        newValue: newValue,
        serviceId: service._id
      });

      // Optimistic UI update
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, isActive: newValue }
            : s
        )
      );

      const response = await fetch(`/api/admin/services?id=${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newValue })
      });

      const data = await response.json();
      console.log('⚡ Toggle response:', data);

      if (data.success) {
        showToast(`Service ${newValue ? 'activated' : 'deactivated'}`, 'success');
        fetchServices(); // Refresh to ensure sync
      } else {
        // Revert on error
        setServices(prevServices =>
          prevServices.map(s =>
            s._id === service._id
              ? { ...s, isActive: !newValue }
              : s
          )
        );
        showToast(data.error || 'Failed to update service', 'error');
      }
    } catch (error) {
      console.error('⚡ Toggle error:', error);
      // Revert on error
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, isActive: service.isActive }
            : s
        )
      );
      showToast('Failed to update service', 'error');
    }
  };

  const handleToggleServiceTag = async (service: Service) => {
    try {
      const newValue = !service.itemTagEnabled;
      console.log(`🏷️ Toggling itemTagEnabled for ${service.name}:`, {
        currentValue: service.itemTagEnabled,
        newValue: newValue,
        tagName: service.itemTagName,
        serviceId: service._id
      });

      // Optimistic UI update
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, itemTagEnabled: newValue }
            : s
        )
      );

      const response = await fetch(`/api/admin/services?id=${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemTagEnabled: newValue })
      });

      const data = await response.json();
      console.log('🏷️ Toggle response:', data);

      if (data.success) {
        showToast(`Item tags ${newValue ? 'enabled' : 'disabled'} for ${service.name}`, 'success');
        // Don't call fetchServices() to avoid resetting the UI state
      } else {
        // Revert on error
        setServices(prevServices =>
          prevServices.map(s =>
            s._id === service._id
              ? { ...s, itemTagEnabled: !newValue }
              : s
          )
        );
        showToast(data.error || 'Failed to update service', 'error');
      }
    } catch (error) {
      console.error('🏷️ Toggle error:', error);
      // Revert on error
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, itemTagEnabled: service.itemTagEnabled }
            : s
        )
      );
      showToast('Failed to update service', 'error');
    }
  };

  const handleUpdateTagName = async (service: Service, newTagName: string) => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) {
      showToast('Tag name cannot be empty', 'error');
      return;
    }

    // Set loading state for this specific service
    setSavingTagName(service._id!);

    try {
      console.log(`🏷️ Updating tag name for ${service.name}:`, {
        oldTagName: service.itemTagName || '',
        newTagName: trimmedName,
        serviceId: service._id
      });

      // Optimistic UI update
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, itemTagName: newTagName.trim() }
            : s
        )
      );

      const response = await fetch(`/api/admin/services?id=${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemTagName: newTagName.trim() })
      });

      const data = await response.json();
      console.log('🏷️ Tag name update response:', data);

      if (data.success) {
        const isNewTag = !savedTagNames.has(service._id!);
        showToast(isNewTag ? `Tag name added: "${trimmedName}"` : `Tag name updated to "${trimmedName}"`, 'success');

        // Update the local state to reflect the saved tag name immediately
        setServices(prevServices =>
          prevServices.map(s =>
            s._id === service._id
              ? { ...s, itemTagName: trimmedName }
              : s
          )
        );

        console.log('✅ Tag name updated in local state:', trimmedName);

        // Add service to saved tag names set
        setSavedTagNames(prev => new Set([...prev, service._id!]));
      } else {
        // Revert on error
        setServices(prevServices =>
          prevServices.map(s =>
            s._id === service._id
              ? { ...s, itemTagName: service.itemTagName }
              : s
          )
        );
        showToast(data.error || 'Failed to update tag name', 'error');
      }
    } catch (error) {
      console.error('🏷️ Tag name update error:', error);
      // Revert on error
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, itemTagName: service.itemTagName }
            : s
        )
      );
      showToast('Failed to update tag name', 'error');
    } finally {
      // Clear loading state
      setSavingTagName(null);
    }
  };

  const handleToggleItemTag = async (service: Service, itemId: string) => {
    try {
      // Find the item and toggle its showTag property
      const updatedItems = service.items.map(item =>
        item.id === itemId
          ? { ...item, showTag: !item.showTag }
          : item
      );

      const toggledItem = updatedItems.find(item => item.id === itemId);
      const newValue = toggledItem?.showTag || false;

      console.log(`🏷️ Toggling item tag for "${toggledItem?.name}":`, {
        itemId: itemId,
        newValue: newValue,
        serviceId: service._id
      });

      // Optimistic UI update
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, items: updatedItems }
            : s
        )
      );

      const response = await fetch(`/api/admin/services?id=${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems })
      });

      const data = await response.json();
      console.log('🏷️ Item tag toggle response:', data);

      if (data.success) {
        showToast(`Tag ${newValue ? 'enabled' : 'disabled'} for "${toggledItem?.name}"`, 'success');
        // Don't call fetchServices() to avoid resetting the UI state
      } else {
        // Revert on error
        setServices(prevServices =>
          prevServices.map(s =>
            s._id === service._id
              ? { ...s, items: service.items }
              : s
          )
        );
        showToast(data.error || 'Failed to update item tag', 'error');
      }
    } catch (error) {
      console.error('🏷️ Item tag toggle error:', error);
      // Revert on error
      setServices(prevServices =>
        prevServices.map(s =>
          s._id === service._id
            ? { ...s, items: service.items }
            : s
        )
      );
      showToast('Failed to update item tag', 'error');
    }
  };

  // Group items by category for admin view
  const groupItemsByCategory = (items: ServiceItem[]) => {
    if (!Array.isArray(items) || items.length === 0) {
      return [] as { categoryKey: string; label: string; items: ServiceItem[] }[];
    }

    const map = new Map<string, { label: string; items: ServiceItem[] }>();

    items.forEach((item) => {
      const raw = item.categoryName;
      const trimmed = raw?.trim();
      const hasCategory = !!trimmed;
      const key = hasCategory ? trimmed! : '__uncategorized__';
      const label = hasCategory ? trimmed! : 'Other Items';

      if (!map.has(key)) {
        map.set(key, { label, items: [] });
      }
      map.get(key)!.items.push(item);
    });

    return Array.from(map.entries()).map(([categoryKey, value]) => ({
      categoryKey,
      label: value.label,
      items: value.items,
    }));
  };

  if (loading) {
    return (
      <div className="services-page">
        <div className="loading">Loading services...</div>
      </div>
    );
  }

  // Filter services based on status
  const filteredServices = services.filter(service => {
    if (filterStatus === 'active') return service.isActive;
    if (filterStatus === 'inactive') return !service.isActive;
    return true; // 'all'
  });

  return (
    <div className="services-page">
      <div className="page-header">
        <h1>Extra Services Management</h1>
        <div className="header-actions">
          <div className="total-count">
            <span className="count-number">{filteredServices.length}</span>
            <span className="count-label">
              {filterStatus === 'all' ? 'Total' : filterStatus === 'active' ? 'Active' : 'Inactive'} Services
            </span>
          </div>
          <button className="add-btn" onClick={handleAddService}>
            <Plus size={20} />
            Add Service
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="filter-buttons">
        <button
          className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
          onClick={() => setFilterStatus('active')}
        >
          Active ({services.filter(s => s.isActive).length})
        </button>
        <button
          className={`filter-btn ${filterStatus === 'inactive' ? 'active' : ''}`}
          onClick={() => setFilterStatus('inactive')}
        >
          Inactive ({services.filter(s => !s.isActive).length})
        </button>
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All Services ({services.length})
        </button>
      </div>

      <div className="services-list">
        {filteredServices.map((service) => (
          <div key={service._id} className={`service-card ${!service.isActive ? 'inactive' : ''}`}>
            <div className="service-header">
              <div className="service-title">
                <h3>
                  {service.name}
                  {!service.isActive && <span className="inactive-badge">Inactive</span>}
                </h3>
                <span className="items-count">{service.items.length} items</span>
              </div>
              <div className="service-actions">
                <button
                  className="service-settings-btn"
                  onClick={() => toggleSettingsPanel(service._id!)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '24px',
                    border: 'none',
                    background: openSettingsPanels.has(service._id!) ? '#F2B365' : '#1E1E1E',
                    color: openSettingsPanels.has(service._id!) ? '#111' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: openSettingsPanels.has(service._id!)
                      ? '0 10px 20px rgba(242, 179, 101, 0.35)'
                      : '0 10px 20px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {openSettingsPanels.has(service._id!) ? 'Hide Settings' : 'Show Settings'}
                </button>
                <div className="tag-control-container">
                  <label className="toggle-container">
                    <input
                      type="checkbox"
                      checked={service.itemTagEnabled || false}
                      onChange={() => handleToggleServiceTag(service)}
                    />
                    <span className="toggle-label">Item Tags</span>
                  </label>
                  {service.itemTagEnabled && (
                    <div className="tag-input-container">
                      <input
                        type="text"
                        className={`tag-name-input ${hasExistingTagName(service) && editingTagName !== service._id ? 'disabled' : ''}`}
                        value={service.itemTagName || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          console.log('🏷️ Tag name typing:', newValue);

                          // Update local state immediately for smooth typing
                          setServices(prevServices =>
                            prevServices.map(s =>
                              s._id === service._id
                                ? { ...s, itemTagName: newValue }
                                : s
                            )
                          );

                          // Clear any existing timeout
                          if ((window as any).tagNameTimeout) {
                            clearTimeout((window as any).tagNameTimeout);
                          }
                        }}
                        onFocus={(e) => {
                          // Select all text when clicking on input for easy replacement
                          e.target.select();
                          console.log('🏷️ Tag name input focused, text selected');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const inputValue = e.currentTarget.value.trim();
                            if (inputValue) {
                              console.log('🏷️ Enter pressed, saving tag name');
                              if (hasExistingTagName(service)) {
                                handleUpdateTagName(service, inputValue);
                                setEditingTagName(null); // Exit edit mode
                              } else {
                                handleUpdateTagName(service, inputValue);
                              }
                            }
                          }
                        }}
                        disabled={hasExistingTagName(service) && editingTagName !== service._id}
                        placeholder="Enter tag name (e.g., Bestseller, Trending)"
                        maxLength={20}
                        readOnly={hasExistingTagName(service) && editingTagName !== service._id}
                      />
                      <button
                        type="button"
                        className={hasExistingTagName(service) ? "tag-edit-btn" : "tag-add-btn"}
                        onClick={() => {
                          const currentTagName = service.itemTagName?.trim();

                          if (hasExistingTagName(service)) {
                            // Edit mode - enable input for editing
                            if (editingTagName === service._id) {
                              // Save the edited name
                              if (currentTagName) {
                                console.log('🏷️ Saving edited tag name:', currentTagName);
                                handleUpdateTagName(service, currentTagName);
                                setEditingTagName(null); // Exit edit mode
                              }
                            } else {
                              // Enter edit mode
                              console.log('🏷️ Entering edit mode for:', service.name);
                              setEditingTagName(service._id!);
                            }
                          } else {
                            // Add mode - save new tag name
                            if (currentTagName) {
                              console.log('🏷️ Adding new tag name:', currentTagName);
                              handleUpdateTagName(service, currentTagName);
                            } else {
                              showToast('Please enter a tag name first', 'error');
                            }
                          }
                        }}
                        disabled={!service.itemTagName?.trim() || savingTagName === service._id}
                        title={hasExistingTagName(service) ? "Update tag name" : "Save tag name to database"}
                      >
                        {savingTagName === service._id ? 'Saving...' :
                          hasExistingTagName(service) ?
                            (editingTagName === service._id ? 'Save' : 'Edit') :
                            'Add'}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="expand-btn"
                  onClick={() => toggleExpand(service._id!)}
                >
                  {expandedServices.has(service._id!) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <button className="edit-btn" onClick={() => handleEditServiceClick(service)}>
                  <Edit size={18} />
                </button>
                <button className="add-item-btn" onClick={() => handleAddItemClick(service)}>
                  <Plus size={18} />
                  Add Item
                </button>
                <button className="delete-btn" onClick={() => handleDeleteServiceClick(service._id!)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {openSettingsPanels.has(service._id!) && (
              <div className="service-toggle-panel">
                <label className="toggle-container">
                  <input
                    type="checkbox"
                    checked={service.isActive}
                    onChange={() => handleToggleActive(service)}
                  />
                  <span className="toggle-label">{service.isActive ? 'Active' : 'Inactive'}</span>
                </label>
                <label className="toggle-container">
                  <input
                    type="checkbox"
                    checked={service.includeInDecoration || false}
                    onChange={() => handleToggleDecoration(service)}
                  />
                  <span className="toggle-label">Include in Decoration</span>
                </label>
                <label className="toggle-container">
                  <input
                    type="checkbox"
                    checked={service.showInBookingPopup ?? true}
                    onChange={() => handleToggleShowInBooking(service)}
                  />
                  <span className="toggle-label">Show in Booking Popup</span>
                </label>
                <label className="toggle-container">
                  <input
                    type="checkbox"
                    checked={service.compulsory || false}
                    onChange={() => handleToggleCompulsory(service)}
                  />
                  <span className="toggle-label">Compulsory</span>
                </label>
                <div className="toggle-container">
                  <span className="toggle-label">Item Tags</span>
                  <label className="toggle-container">
                    <input
                      type="checkbox"
                      checked={service.itemTagEnabled || false}
                      onChange={() => handleToggleServiceTag(service)}
                    />
                    <span className="toggle-label">Enable</span>
                  </label>
                </div>
              </div>
            )}

            {expandedServices.has(service._id!) && (
              <div className="items-by-category">
                {groupItemsByCategory(service.items || []).map((group) => (
                  <div key={group.categoryKey} className="category-section">
                    <div className="category-heading">{group.label}</div>
                    <div className="category-items-summary">
                      This category has: {group.items.map((it) => it.name).join(', ')}
                    </div>
                    <div className="items-grid">
                      {group.items.map((item) => (
                        <div key={item.id} className="item-card">
                          <div className="item-image">
                            <img src={item.imageUrl} alt={item.name} />
                            {service.itemTagEnabled && service.itemTagName && item.showTag && (
                              <div className="item-tag">
                                {service.itemTagName}
                              </div>
                            )}
                          </div>
                          <div className="item-info">
                            <h4>{item.name}</h4>
                            {isFoodServiceName(service.name) && item.vegType && (
                              <div className={`veg-status ${item.vegType === 'veg' ? 'veg' : 'non-veg'}`}>
                                <span className="veg-indicator" />
                                {item.vegType === 'veg' ? 'Veg' : 'Non Veg'}
                              </div>
                            )}
                            <p className="item-price">
                              {item.pricingMode === 'half-full' ? (
                                <>
                                  {item.halfPrice && (
                                    <span>
                                      Half: ₹{item.halfPrice}
                                      {item.fullPrice && ' / '}
                                    </span>
                                  )}
                                  {item.fullPrice && <span>Full: ₹{item.fullPrice}</span>}
                                  {!item.halfPrice && !item.fullPrice && item.price && (
                                    <span>₹{item.price}</span>
                                  )}
                                </>
                              ) : item.pricingMode === 'three-size' ? (
                                <>
                                  {item.smallPrice && (
                                    <span>
                                      S: ₹{item.smallPrice}
                                      {(item.mediumPrice || item.largePrice) && ' / '}
                                    </span>
                                  )}
                                  {item.mediumPrice && (
                                    <span>
                                      M: ₹{item.mediumPrice}
                                      {item.largePrice && ' / '}
                                    </span>
                                  )}
                                  {item.largePrice && <span>F: ₹{item.largePrice}</span>}
                                  {!item.smallPrice && !item.mediumPrice && !item.largePrice && item.price && (
                                    <span>₹{item.price}</span>
                                  )}
                                </>
                              ) : item.price ? (
                                <span>₹{item.price}</span>
                              ) : null}
                            </p>
                            {service.itemTagEnabled && (
                              <div className="item-tag-control">
                                <label className="item-toggle-container">
                                  <input
                                    type="checkbox"
                                    checked={item.showTag || false}
                                    onChange={() => handleToggleItemTag(service, item.id)}
                                  />
                                  <span className="item-toggle-label">Show Tag</span>
                                </label>
                              </div>
                            )}
                            {isFoodServiceName(service.name) && (
                              <div className="veg-toggle">
                                <span className="veg-toggle-label">Veg Type</span>
                                <div className="veg-toggle-buttons">
                                  <button
                                    type="button"
                                    className={`veg-toggle-btn veg-option ${item.vegType === 'veg' ? 'active' : ''}`}
                                    onClick={() => handleVegTypeChange(service, item.id, 'veg')}
                                  >
                                    <span className="veg-indicator" />
                                    Veg
                                  </button>
                                  <button
                                    type="button"
                                    className={`veg-toggle-btn non-veg-option ${item.vegType === 'non-veg' ? 'active' : ''}`}
                                    onClick={() => handleVegTypeChange(service, item.id, 'non-veg')}
                                  >
                                    <span className="veg-indicator" />
                                    Non Veg
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            className="item-delete-btn"
                            onClick={() => handleDeleteItemClick(service, item.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Service Popup */}
      {showAddServicePopup && (
        <div className="popup-overlay" onClick={() => setShowAddServicePopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>{editingService ? 'Edit Service' : 'Add New Service'}</h2>
              <button className="close-btn" onClick={() => { setShowAddServicePopup(false); setEditingService(null); setServiceName(''); }}>×</button>
            </div>

            <div className="popup-body">
              <div className="form-group">
                <label>Service Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g., Food & Beverage, Decorations"
                />
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowAddServicePopup(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSaveService}>
                  Add Service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Popup */}
      {showAddItemPopup && (
        <div className="popup-overlay" onClick={() => setShowAddItemPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Add Item to {selectedService?.name}</h2>
              <button className="close-btn" onClick={() => setShowAddItemPopup(false)}>×</button>
            </div>

            <div className="popup-body">
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Pizza, Burger"
                />
              </div>

              {isFoodServiceName(selectedService?.name) && (
                <div className="form-group">
                  <label>Veg Type</label>
                  <div className="veg-toggle-buttons">
                    <button
                      type="button"
                      className={`veg-toggle-btn veg-option ${itemVegType === 'veg' ? 'active' : ''}`}
                      onClick={() => setItemVegType('veg')}
                    >
                      <span className="veg-indicator" />
                      Veg
                    </button>
                    <button
                      type="button"
                      className={`veg-toggle-btn non-veg-option ${itemVegType === 'non-veg' ? 'active' : ''}`}
                      onClick={() => setItemVegType('non-veg')}
                    >
                      <span className="veg-indicator" />
                      Non Veg
                    </button>
                  </div>
                </div>
              )}

              {/* Pricing Type: Single vs Half/Full vs Small/Medium/Full */}
              <div className="form-group">
                <label>Pricing Type</label>
                <div className="pricing-mode-toggle">
                  <label>
                    <input
                      type="radio"
                      name="pricingMode"
                      value="single"
                      checked={itemPricingMode === 'single'}
                      onChange={() => setItemPricingMode('single')}
                    />
                    <span>Single Price</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="pricingMode"
                      value="half-full"
                      checked={itemPricingMode === 'half-full'}
                      onChange={() => setItemPricingMode('half-full')}
                    />
                    <span>Half / Full</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="pricingMode"
                      value="three-size"
                      checked={itemPricingMode === 'three-size'}
                      onChange={() => setItemPricingMode('three-size')}
                    />
                    <span>Small / Medium / Full</span>
                  </label>
                </div>
              </div>

              {itemPricingMode === 'single' && (
                <div className="form-group">
                  <label>Price (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="e.g., 299"
                  />
                </div>
              )}

              {itemPricingMode === 'half-full' && (
                <div className="form-group half-full-grid">
                  <div>
                    <label>Half Price</label>
                    <input
                      type="number"
                      className="form-input"
                      value={itemHalfPrice}
                      onChange={(e) => setItemHalfPrice(e.target.value)}
                      placeholder="e.g., 199"
                    />
                  </div>
                  <div>
                    <label>Full Price</label>
                    <input
                      type="number"
                      className="form-input"
                      value={itemFullPrice}
                      onChange={(e) => setItemFullPrice(e.target.value)}
                      placeholder="e.g., 349"
                    />
                  </div>
                </div>
              )}

              {itemPricingMode === 'three-size' && (
                <div className="form-group half-full-grid">
                  <div>
                    <label>Small Price</label>
                    <input
                      type="number"
                      className="form-input"
                      value={itemSmallPrice}
                      onChange={(e) => setItemSmallPrice(e.target.value)}
                      placeholder="e.g., 199"
                    />
                  </div>
                  <div>
                    <label>Medium Price</label>
                    <input
                      type="number"
                      className="form-input"
                      value={itemMediumPrice}
                      onChange={(e) => setItemMediumPrice(e.target.value)}
                      placeholder="e.g., 249"
                    />
                  </div>
                  <div>
                    <label>Full Price</label>
                    <input
                      type="number"
                      className="form-input"
                      value={itemLargePrice}
                      onChange={(e) => setItemLargePrice(e.target.value)}
                      placeholder="e.g., 299"
                    />
                  </div>
                </div>
              )}

              {/* Category selection for grouping food items */}
              <div className="form-group">
                <label>Category (Optional)</label>

                {allCategories.length > 0 && (
                  <div className="category-select-row">
                    <select
                      className="form-input"
                      value={itemCategoryName}
                      onChange={(e) => setItemCategoryName(e.target.value)}
                    >
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-secondary small"
                      onClick={() => {
                        setShowCategoryPopup(true);
                        setNewCategoryName('');
                      }}
                    >
                      Add Category
                    </button>
                  </div>
                )}

                {allCategories.length === 0 && (
                  <button
                    type="button"
                    className="btn-secondary small"
                    onClick={() => {
                      setShowCategoryPopup(true);
                      setNewCategoryName('');
                    }}
                  >
                    Add Category
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Item Image *</label>
                {selectedService?.itemTagEnabled && (
                  <div className="tag-name-input-container">
                    <input
                      type="text"
                      className="tag-name-input"
                      value={selectedService?.itemTagName || 'Popular'}
                      readOnly
                    />
                  </div>
                )}
                {!imagePreview ? (
                  <div className="image-upload-placeholder">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                      id="item-image-upload"
                    />
                    <label htmlFor="item-image-upload" className="upload-label">
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
                <button className="btn-secondary" onClick={() => setShowAddItemPopup(false)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveItem}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Popup */}
      {showCategoryPopup && (
        <div className="popup-overlay" onClick={() => setShowCategoryPopup(false)}>
          <div
            className="popup-content category-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-header">
              <h2>Add Category</h2>
              <button
                className="close-btn"
                onClick={() => setShowCategoryPopup(false)}
              >
                ×
              </button>
            </div>
            <div className="popup-body small-popup-body">
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Starters, Main Course, Drinks"
                />
              </div>
              <div className="form-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowCategoryPopup(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    const trimmed = newCategoryName.trim();
                    if (!trimmed) {
                      showToast('Please enter category name', 'error');
                      return;
                    }
                    setAllCategories((prev) =>
                      prev.includes(trimmed)
                        ? [...prev].sort()
                        : [...prev, trimmed].sort(),
                    );
                    setItemCategoryName(trimmed);
                    setShowCategoryPopup(false);
                  }}
                >
                  Save Category
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
              <p>
                {deleteConfirm.type === 'service'
                  ? 'Are you sure you want to delete this service? All items in this service will also be deleted.'
                  : 'Are you sure you want to delete this item? This action cannot be undone.'}
              </p>
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

      <style jsx>{`
        .services-page {
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

        .filter-buttons {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 0.5rem;
          background: #f9fafb;
          border-radius: 12px;
          width: fit-content;
        }

        .filter-btn {
          padding: 0.75rem 1.5rem;
          border: 2px solid transparent;
          border-radius: 8px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
          color: #64748b;
        }

        .filter-btn:hover {
          border-color: #e2e8f0;
          color: #475569;
        }

        .filter-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .services-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .service-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: opacity 0.3s ease;
        }

        .service-card.inactive {
          opacity: 0.6;
          background: #f9fafb;
        }

        .service-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .service-title h3 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .inactive-badge {
          font-size: 0.75rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          padding: 0.25rem 0.75rem;
          background: #ef4444;
          color: white;
          border-radius: 12px;
          font-weight: 600;
        }

        .items-count {
          font-size: 0.9rem;
          color: #666;
        }

        .service-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f9fafb;
          border-radius: 6px;
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
          font-size: 0.85rem;
          color: #475569;
          white-space: nowrap;
        }

        .expand-btn, .edit-btn, .add-item-btn, .delete-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .expand-btn {
          background: #f3f4f6;
          color: #333;
        }

        .expand-btn:hover {
          background: #e5e7eb;
        }

        .edit-btn {
          background: #fef3c7;
          color: #d97706;
        }

        .edit-btn:hover {
          background: #d97706;
          color: white;
        }

        .add-item-btn {
          background: #f0f9ff;
          color: #0369a1;
        }

        .add-item-btn:hover {
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

        .items-by-category {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .category-section {
          border-top: 1px dashed #e5e7eb;
          padding-top: 1rem;
        }

        .category-heading {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #111827;
          margin-bottom: 0.15rem;
        }

        .category-items-summary {
          font-size: 0.8rem;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .item-card {
          background: #f9fafb;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .item-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .item-image {
          width: 100%;
          height: 150px;
          overflow: hidden;
          padding: 0.75rem;
          background: white;
        }

        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }

        .item-info {
          padding: 1rem;
        }

        .item-info h4 {
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          font-size: 1rem;
          color: #333;
          margin-bottom: 0.25rem;
        }

        .veg-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #94a3b8;
          box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.25);
          flex-shrink: 0;
        }

        .veg-status {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.4rem;
          color: #0f172a;
        }

        .veg-status.veg .veg-indicator {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
        }

        .veg-status.non-veg .veg-indicator {
          background: #dc2626;
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
        }

        .item-price {
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.9rem;
          color: var(--accent-color);
          font-weight: 600;
        }

        .veg-toggle {
          margin-top: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .veg-toggle-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #475569;
          font-weight: 600;
        }

        .veg-toggle-buttons {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .veg-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #1e293b;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .veg-toggle-btn.veg-option.active {
          border-color: rgba(22, 163, 74, 0.4);
          background: rgba(22, 163, 74, 0.08);
          color: #166534;
        }

        .veg-toggle-btn.veg-option.active .veg-indicator {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
        }

        .veg-toggle-btn.non-veg-option.active {
          border-color: rgba(220, 38, 38, 0.4);
          background: rgba(220, 38, 38, 0.08);
          color: #b91c1c;
        }

        .veg-toggle-btn.non-veg-option.active .veg-indicator {
          background: #dc2626;
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
        }

        .veg-toggle-btn:hover {
          border-color: #cbd5f5;
          transform: translateY(-1px);
        }

        .item-delete-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(220, 38, 38, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .item-card:hover .item-delete-btn {
          opacity: 1;
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

        .popup-content.category-popup {
          max-width: 420px;
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

        .popup-body.small-popup-body {
          padding: 1.25rem 1.5rem 1.25rem 1.5rem;
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
          max-width: 450px;
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

        /* Tag Control Styles */
        .tag-control-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .tag-input-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .tag-name-input-container {
          display: flex;
          align-items: center;
          position: relative;
        }

        .tag-name-input {
          padding: 0.375rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.875rem;
          background: white;
          color: #374151;
          min-width: 120px;
          transition: border-color 0.2s ease;
          flex: 1;
        }

        .tag-name-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .tag-name-input::placeholder {
          color: #9ca3af;
        }

        .tag-name-input.disabled {
          background: #f3f4f6;
          color: #6b7280;
          cursor: not-allowed;
          border-color: #d1d5db;
        }

        .tag-name-input:disabled {
          background: #f3f4f6;
          color: #6b7280;
          cursor: not-allowed;
        }

        .tag-add-btn {
          padding: 0.375rem 0.75rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tag-add-btn:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }

        .tag-add-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .tag-edit-btn {
          padding: 0.375rem 0.75rem;
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 4px;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tag-edit-btn:hover:not(:disabled) {
          background: #d97706;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
        }

        .tag-edit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .tag-clear-btn {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .tag-clear-btn:hover {
          background: #dc2626;
          transform: translateY(-50%) scale(1.1);
        }

        /* Item Tag Styles */
        .item-image {
          position: relative;
          width: 100%;
          height: 120px;
          border-radius: 8px;
          overflow: hidden;
        }

        .item-tag {
          position: absolute;
          top: 8px;
          right: 8px;
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          color: white;
          font-size: 0.75rem;
          font-family: 'Paralucent-DemiBold', Arial, Helvetica, sans-serif;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(238, 90, 36, 0.3);
          z-index: 10;
          animation: tagPulse 2s infinite;
        }

        @keyframes tagPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(238, 90, 36, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(238, 90, 36, 0.5);
          }
        }

        .item-tag:hover {
          animation-play-state: paused;
          transform: scale(1.1);
        }

        /* Item Toggle Control Styles */
        .item-tag-control {
          margin-top: 0.5rem;
          padding: 0.375rem;
          background: #f1f5f9;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .item-toggle-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .item-toggle-container input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #ff6b6b;
          cursor: pointer;
        }

        .item-toggle-label {
          font-size: 0.75rem;
          font-family: 'Paralucent-Medium', Arial, Helvetica, sans-serif;
          color: #475569;
          cursor: pointer;
          user-select: none;
        }

        .item-toggle-container:hover .item-toggle-label {
          color: #334155;
        }

        .item-toggle-container input[type="checkbox"]:checked + .item-toggle-label {
          color: #ff6b6b;
          font-weight: 600;
        }

      `}</style>
    </div>
  );
}

