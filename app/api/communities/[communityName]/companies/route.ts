import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Community from '@/app/models/Community';
import Plan from '@/app/models/Plan';
import Company from '@/app/models/Company';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ communityName: string }> | { communityName: string } }
) {
  try {
    await connectDB();
    const body = await request.json();
    const { companyId, companyName } = body; // Accept both ID and name for backward compatibility
    
    // Handle params as either Promise or direct object (for Next.js version compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!resolvedParams?.communityName) {
      return NextResponse.json(
        { error: 'Community name is required' },
        { status: 400 }
      );
    }
    
    const communityIdentifier = decodeURIComponent(resolvedParams.communityName);

    // Require either companyId or companyName
    if (!companyId && (!companyName || !companyName.trim())) {
      return NextResponse.json(
        { error: 'Company ID or name is required' },
        { status: 400 }
      );
    }

    if (!communityIdentifier || !communityIdentifier.trim() || communityIdentifier === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid community identifier' },
        { status: 400 }
      );
    }

    const trimmedCommunityIdentifier = communityIdentifier.trim();

    // Find company by ID if provided, otherwise by name
    let company;
    if (companyId) {
      company = await Company.findById(companyId);
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
    } else {
      const trimmedCompanyName = companyName.trim();
      // Find company by name (case-insensitive)
      const escapedName = trimmedCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      company = await Company.findOne({ 
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
      });
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
    }

    // Find community by ID if it's a valid MongoDB ObjectId, otherwise by name
    let community;
    if (mongoose.Types.ObjectId.isValid(trimmedCommunityIdentifier)) {
      // Try to find by ID first
      community = await Community.findById(trimmedCommunityIdentifier);
    }
    
    // If not found by ID or not a valid ObjectId, try to find by name
    if (!community) {
      const trimmedCommunityName = trimmedCommunityIdentifier;
      // Find or create community (case-insensitive search, but preserve original case)
      community = await Community.findOne({ 
        name: { $regex: new RegExp(`^${trimmedCommunityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      
      if (!community) {
        // Create community if it doesn't exist
        community = new Community({
          name: trimmedCommunityName,
          companies: [],
        });
        await community.save();
      }
    }
    
    if (community) {
      // Migration: Convert any string company names to ObjectIds if needed
      const companyNamesToMigrate = community.companies.filter((c: any) => typeof c === 'string');
      if (companyNamesToMigrate.length > 0) {
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

    // Check if company is already in the community (by ID)
    const companyExists = community.companies.some(
      (companyId: any) => {
        if (typeof companyId === 'string') {
          // Handle legacy string names
          return companyId.trim().toLowerCase() === company.name.trim().toLowerCase();
        }
        // Convert both to strings for comparison
        const existingId = mongoose.Types.ObjectId.isValid(companyId) 
          ? companyId.toString() 
          : String(companyId);
        const newId = company._id.toString();
        return existingId === newId;
      }
    );
    
    if (companyExists) {
      // Populate before returning
      await community.populate('companies');
      return NextResponse.json(
        { error: 'Company is already in this community', community },
        { status: 409 }
      );
    }

    // Add company ID to community (ensure it's a proper ObjectId)
    // company._id should already be an ObjectId from Mongoose
    let companyObjectId: mongoose.Types.ObjectId;
    if (company._id instanceof mongoose.Types.ObjectId) {
      companyObjectId = company._id;
    } else if (typeof company._id === 'string' && mongoose.Types.ObjectId.isValid(company._id)) {
      companyObjectId = new mongoose.Types.ObjectId(company._id);
    } else {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }
    
    // Use MongoDB's $addToSet to ensure the company ID is added (and not duplicated)
    const updateResult = await Community.updateOne(
      { _id: community._id },
      { $addToSet: { companies: companyObjectId } }
    );
    
    if (updateResult.modifiedCount === 0 && !companyExists) {
      // Company might already exist, but we already checked, so this is unexpected
      console.warn('Company was not added. Update result:', updateResult);
    }
    
    // Reload community from database and populate companies to return updated data
    const updatedCommunity = await Community.findById(community._id).populate({
      path: 'companies',
      model: 'Company',
      select: 'name _id',
    });
    
    if (!updatedCommunity) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated community after save' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(updatedCommunity, { status: 200 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Community already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add company to community', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ communityName: string }> | { communityName: string } }
) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const companyName = searchParams.get('company'); // Backward compatibility
    
    // Handle params as either Promise or direct object (for Next.js version compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const communityIdentifier = decodeURIComponent(resolvedParams.communityName);

    if (!companyId && !companyName) {
      return NextResponse.json(
        { error: 'Company ID or name is required' },
        { status: 400 }
      );
    }

    // Find company to get its name
    let company;
    if (companyId) {
      company = await Company.findById(companyId);
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
    } else {
      // Find by name (case-insensitive)
      const escapedName = companyName!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      company = await Company.findOne({ 
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
      });
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
    }

    // Find community by ID if it's a valid MongoDB ObjectId, otherwise by name
    let community;
    if (mongoose.Types.ObjectId.isValid(communityIdentifier)) {
      // Try to find by ID first
      community = await Community.findById(communityIdentifier);
    }
    
    // If not found by ID or not a valid ObjectId, try to find by name
    if (!community) {
      const trimmedCommunityName = communityIdentifier.trim();
      community = await Community.findOne({ 
        name: { $regex: new RegExp(`^${trimmedCommunityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }
    
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Remove company from community (using company ID)
    community.companies = community.companies.filter(
      (companyId: any) => companyId.toString() !== company._id.toString()
    );
    await community.save();

    // Populate companies before returning
    await community.populate('companies');

    return NextResponse.json(
      { message: 'Company removed from community successfully', community },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to remove company from community', message: error.message },
      { status: 500 }
    );
  }
}

