import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Company from '@/app/models/Company';

export async function GET() {
  try {
    await connectDB();
    const companies = await Company.find().sort({ name: 1 });
    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch companies', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, description, website, headquarters, founded } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ name: name.trim() });
    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company already exists' },
        { status: 409 }
      );
    }

    const company = new Company({
      name: name.trim(),
      description,
      website,
      headquarters,
      founded,
    });

    await company.save();
    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Company already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create company', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    const company = await Company.findByIdAndDelete(id);
    
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Company deleted successfully', company },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete company', message: error.message },
      { status: 500 }
    );
  }
}

