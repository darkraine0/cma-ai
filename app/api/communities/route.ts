import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';

export async function GET() {
  try {
    await connectDB();
    
    // Get all communities and populate companies
    const communities = await Community.find()
      .sort({ name: 1 })
      .populate({
        path: 'companies',
        model: 'Company',
        select: 'name _id',
      });
    
    // Map to response format
    const result = communities.map(community => ({
      _id: community._id.toString(),
      name: community.name,
      description: community.description,
      location: community.location,
      companies: community.companies.map((c: any) => 
        typeof c === 'object' && c?.name ? c.name : String(c)
      ),
      fromPlans: false, // All communities from database are not from plans
    }));
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch communities', message: error.message },
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

