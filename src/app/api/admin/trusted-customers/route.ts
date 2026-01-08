import { NextRequest, NextResponse } from 'next/server';
import database from '@/lib/db-connect';

const parseTags = (tags: unknown): string[] => {
  if (Array.isArray(tags)) {
    return tags.map(tag => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeCustomer = (customer: any) => {
  if (!customer || typeof customer !== 'object') {
    return customer;
  }

  const normalized: Record<string, unknown> = {
    ...customer,
    tags: Array.isArray(customer.tags) ? customer.tags : parseTags(customer.tags)
  };

  if (customer._id && typeof customer._id === 'object' && 'toString' in customer._id) {
    normalized._id = (customer._id as any).toString();
  }

  if (customer.createdAt instanceof Date) {
    normalized.createdAt = customer.createdAt.toISOString();
  }

  if (customer.updatedAt instanceof Date) {
    normalized.updatedAt = customer.updatedAt.toISOString();
  }

  normalized.billingPreference = customer.billingPreference === 'free' ? 'free' : 'paid';

  return normalized;
};

export async function GET() {
  try {
    const customers = await database.getAllTrustedCustomers();
    const normalizedCustomers = customers.map(normalizeCustomer);

    return NextResponse.json({
      success: true,
      customers: normalizedCustomers
    });
  } catch (error) {
    console.error('❌ Failed to fetch trusted customers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trusted customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, company, email, phone, notes, tags, isActive = true, billingPreference } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      );
    }

    const payload = {
      name: String(name).trim(),
      company: company ? String(company).trim() : '',
      email: email ? String(email).trim() : '',
      phone: phone ? String(phone).trim() : '',
      notes: notes ? String(notes).trim() : '',
      tags: parseTags(tags),
      isActive: Boolean(isActive),
      billingPreference: billingPreference === 'free' ? 'free' : 'paid'
    };

    const result = await database.saveTrustedCustomer(payload);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to save trusted customer' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Trusted customer added successfully',
        customer: normalizeCustomer(result.customer)
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Failed to add trusted customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add trusted customer' },
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
        { success: false, error: 'Customer identifier is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, company, email, phone, notes, tags, isActive, billingPreference } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = String(name);
    if (company !== undefined) updateData.company = company ? String(company) : '';
    if (email !== undefined) updateData.email = email ? String(email) : '';
    if (phone !== undefined) updateData.phone = phone ? String(phone) : '';
    if (notes !== undefined) updateData.notes = notes ? String(notes) : '';
    if (tags !== undefined) updateData.tags = parseTags(tags);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (billingPreference !== undefined) {
      updateData.billingPreference = billingPreference === 'free' ? 'free' : 'paid';
    }

    const result = await database.updateTrustedCustomer(id, updateData);

    if (!result.success) {
      const status = result.error === 'Trusted customer not found' ? 404 : 500;
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update trusted customer' },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trusted customer updated successfully',
      customer: normalizeCustomer(result.customer)
    });
  } catch (error) {
    console.error('❌ Failed to update trusted customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update trusted customer' },
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
        { success: false, error: 'Customer identifier is required' },
        { status: 400 }
      );
    }

    const result = await database.deleteTrustedCustomer(id);

    if (!result.success) {
      const status = result.error === 'Trusted customer not found' ? 404 : 500;
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to delete trusted customer' },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trusted customer deleted successfully'
    });
  } catch (error) {
    console.error('❌ Failed to delete trusted customer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete trusted customer' },
      { status: 500 }
    );
  }
}

