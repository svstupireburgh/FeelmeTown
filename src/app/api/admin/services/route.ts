import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';
import { db as mockDb } from '@/lib/mock-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Admin panel may request all services including inactive ones
    const services = includeInactive
      ? await database.getAllServicesIncludingInactive()
      : await database.getAllServices();

    // If no services found or items arrays are empty, provide a robust fallback from mock DB
    const hasUsableItems = Array.isArray(services) && services.some(s => Array.isArray(s.items) && s.items.length > 0);

    if (!hasUsableItems) {
      const cakes = mockDb.getItems('cakes');
      const decor = mockDb.getItems('decor');
      const gifts = mockDb.getItems('gifts');

      const fallbackServices = [
        { serviceId: 'SRV_FALLBACK_CAKES', name: 'Cakes', items: cakes, isActive: true, createdAt: new Date() },
        { serviceId: 'SRV_FALLBACK_DECOR', name: 'Decor Items', items: decor, isActive: true, createdAt: new Date() },
        { serviceId: 'SRV_FALLBACK_GIFTS', name: 'Gifts', items: gifts, isActive: true, createdAt: new Date() }
      ];

      

      return NextResponse.json({
        success: true,
        services: fallbackServices,
        source: 'fallback'
      });
    }

    return NextResponse.json({
      success: true,
      services: services,
      source: 'database'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, items, showInBookingPopup } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Service name is required' },
        { status: 400 }
      );
    }

    const serviceData = {
      name,
      items: items || [],
      isActive: true,
      showInBookingPopup: showInBookingPopup ?? true,
    };

    const result = await database.saveService(serviceData);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service added successfully',
      service: result.service
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to add service' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Service ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, items, isActive, includeInDecoration, compulsory, itemTagEnabled, itemTagName, showInBookingPopup } = body;

    console.log('🔄 PUT /api/admin/services - Received body:', body);
    console.log('🔍 includeInDecoration value:', includeInDecoration);
    console.log('🔍 compulsory value:', compulsory);
    console.log('🏷️ itemTagEnabled value:', itemTagEnabled);
    console.log('🏷️ itemTagName value:', itemTagName);

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (items !== undefined) updateData.items = items;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (includeInDecoration !== undefined) updateData.includeInDecoration = includeInDecoration;
    if (compulsory !== undefined) updateData.compulsory = compulsory;
    if (itemTagEnabled !== undefined) updateData.itemTagEnabled = itemTagEnabled;
    if (itemTagName !== undefined) updateData.itemTagName = itemTagName;
    if (showInBookingPopup !== undefined) updateData.showInBookingPopup = showInBookingPopup;
    
    console.log('📦 updateData being sent to database:', updateData);

    const result = await database.updateService(id, updateData);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service updated successfully',
      service: result.service
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Service ID is required' },
        { status: 400 }
      );
    }

    const result = await database.deleteService(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}

