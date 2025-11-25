import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';
import Company from '@/app/models/Company'; // Import to ensure model is registered

export async function GET() {
  try {
    // Check if MongoDB URI is configured
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Database configuration error', 
          message: 'MONGODB_URI is not configured. Please check your environment variables.' 
        },
        { status: 500 }
      );
    }

    await connectDB();
    
    // Get all communities and populate companies
    // Import Company model ensures it's registered for populate
    const communities = await Community.find()
      .sort({ name: 1 })
      .populate({
        path: 'companies',
        select: 'name _id',
      });
    
    // Map to response format
    const result = communities.map((community: any) => ({
      _id: community._id.toString(),
      name: community.name,
      description: community.description || null,
      location: community.location || null,
      companies: (community.companies || []).map((c: any) => {
        // Handle populated companies (objects) or ObjectIds (strings)
        if (c && typeof c === 'object' && c.name) {
          return c.name;
        }
        // If populate failed or is an ObjectId, return empty string
        return typeof c === 'string' ? c : '';
      }).filter((name: string) => name), // Filter out empty strings
      fromPlans: false, // All communities from database are not from plans
    }));
    
    return NextResponse.json(result);
  } catch (error: any) {
    // Log detailed error for debugging (server-side only)
    console.error('Error fetching communities:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    // Provide user-friendly error message
    let errorMessage = 'Failed to fetch communities';
    if (error.message?.includes('MONGODB_URI')) {
      errorMessage = 'Database configuration error';
    } else if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Database connection failed. Please check your database configuration.';
    }

    return NextResponse.json(
      { 
        error: errorMessage, 
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching communities'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, description, location } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Community name is required' },
        { status: 400 }
      );
    }

    // Check if community already exists
    const existingCommunity = await Community.findOne({ name: name.trim() });
    if (existingCommunity) {
      return NextResponse.json(
        { error: 'Community already exists' },
        { status: 409 }
      );
    }

    const community = new Community({
      name: name.trim(),
      description,
      location,
      companies: [],
    });

    await community.save();
    return NextResponse.json(community, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Community already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create community', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    // Delete all communities
    if (deleteAll) {
      const result = await Community.deleteMany({});
      return NextResponse.json(
        { 
          message: `Successfully deleted ${result.deletedCount} communit${result.deletedCount === 1 ? 'y' : 'ies'}`,
          deletedCount: result.deletedCount 
        },
        { status: 200 }
      );
    }

    // Delete single community by ID
    if (!id) {
      return NextResponse.json(
        { error: 'Community ID is required' },
        { status: 400 }
      );
    }

    const community = await Community.findByIdAndDelete(id);
    
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Community deleted successfully', community },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete community', message: error.message },
      { status: 500 }
    );
  }
}

