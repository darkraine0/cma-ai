import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';
import Plan from '@/app/models/Plan';
import Company from '@/app/models/Company';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    
    // Get all communities from the database (without populate first to handle mixed types)
    const communities = await Community.find().sort({ name: 1 });
    
    // Migrate and populate companies for each community
    for (const community of communities) {
      const companyNamesToMigrate = community.companies.filter((c: any) => typeof c === 'string');
      if (companyNamesToMigrate.length > 0) {
        // Find companies by name
        const companiesToMigrate = await Company.find({
          name: { $in: companyNamesToMigrate }
        });
        const companyIds = companiesToMigrate.map(c => c._id);
        // Keep existing ObjectIds and add migrated ones
        const existingIds = community.companies.filter((c: any) => 
          mongoose.Types.ObjectId.isValid(c) && typeof c !== 'string'
        );
        community.companies = [...existingIds, ...companyIds];
        await community.save();
      }
    }
    
    // Filter out any remaining non-ObjectId values before populating
    // This ensures populate doesn't fail on invalid values
    for (const community of communities) {
      community.companies = community.companies.filter((c: any) => 
        mongoose.Types.ObjectId.isValid(c) && typeof c !== 'string'
      );
    }
    
    // Now populate all communities after migration and filtering
    await Community.populate(communities, {
      path: 'companies',
      model: 'Company',
      select: 'name _id',
    });
    
    // Get communities from existing plans (using new embedded structure)
    const plans = await Plan.find({
      'community.name': { $exists: true, $ne: null },
    }).select('community company');
    
    const communityMap = new Map<string, Set<string>>();
    plans.forEach(plan => {
      const communityName = plan.community?.name || plan.community;
      const companyName = plan.company?.name || plan.company;
      
      if (communityName) {
        if (!communityMap.has(communityName)) {
          communityMap.set(communityName, new Set());
        }
        if (companyName) {
          communityMap.get(communityName)!.add(companyName);
        }
      }
    });
    
    // Merge database communities with plan-derived communities
    const allCommunities = new Map<string, { name: string; companies: string[]; fromPlans: boolean; _id?: string | null; description?: string; location?: string }>();
    
    // Add communities from database (filter out invalid communities)
    communities.forEach(comm => {
      // Skip communities with invalid names
      if (comm.name && comm.name.trim() && comm.name !== 'undefined') {
        // Extract company names from populated companies
        const companyNames = (comm.companies as any[]).map((c: any) => 
          typeof c === 'object' && c?.name ? c.name : String(c)
        ).filter(Boolean);
        
        allCommunities.set(comm.name, {
          _id: comm._id.toString(),
          name: comm.name,
          description: comm.description,
          location: comm.location,
          companies: companyNames,
          fromPlans: false,
        });
      }
    });
    
    // Add communities from plans (filter out invalid communities)
    communityMap.forEach((companies, name) => {
      // Skip communities with invalid names
      if (name && name.trim() && name !== 'undefined') {
        if (allCommunities.has(name)) {
          // Merge companies
          const existing = allCommunities.get(name)!;
          const mergedCompanies = new Set([...existing.companies, ...Array.from(companies)]);
          existing.companies = Array.from(mergedCompanies);
        } else {
          allCommunities.set(name, {
            name,
            companies: Array.from(companies),
            fromPlans: true,
            _id: null,
          });
        }
      }
    });
    
    return NextResponse.json(Array.from(allCommunities.values()));
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

