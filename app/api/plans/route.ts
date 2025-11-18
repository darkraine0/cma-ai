import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Plan from '@/app/models/Plan';
import PriceHistory from '@/app/models/PriceHistory';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Calculate timestamp for 24 hours ago
    const since = new Date();
    since.setHours(since.getHours() - 24);
    
    // Get all plans
    const plans = await Plan.find({
      plan_name: { $exists: true, $ne: null },
      price: { $exists: true, $ne: null },
      company: { $exists: true, $ne: null },
      community: { $exists: true, $ne: null },
    }).sort({ last_updated: -1 });

    // Get recent price changes
    const recentChanges = await PriceHistory.find({
      changed_at: { $gte: since },
    });

    const changedPlanIds = new Set(
      recentChanges.map((ph) => ph.plan_id.toString())
    );

    // Map to response format
    const result = plans.map((plan) => ({
      plan_name: plan.plan_name,
      price: plan.price,
      sqft: plan.sqft || null,
      stories: plan.stories || null,
      price_per_sqft: plan.price_per_sqft || null,
      last_updated: plan.last_updated,
      company: plan.company,
      community: plan.community,
      type: plan.type,
      address: plan.address || null,
      price_changed_recently: changedPlanIds.has(plan._id.toString()),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch plans', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const planData = Array.isArray(body) ? body : [body];

    const results = [];

    for (const data of planData) {
      const {
        plan_name,
        price,
        sqft,
        stories,
        price_per_sqft,
        company,
        community,
        type = 'plan',
        beds,
        baths,
        address,
        design_number,
      } = data;

      if (!plan_name || !price || !company || !community) {
        continue;
      }

      // Find existing plan
      const existingPlan = await Plan.findOne({
        plan_name,
        company,
        community,
        type,
      });

      if (existingPlan) {
        // Check if price changed
        if (existingPlan.price !== price) {
          // Record price history
          const priceHistory = new PriceHistory({
            plan_id: existingPlan._id,
            old_price: existingPlan.price,
            new_price: price,
            changed_at: new Date(),
          });
          await priceHistory.save();

          // Update plan
          existingPlan.price = price;
          existingPlan.last_updated = new Date();
        }

        // Update other fields
        if (sqft !== undefined) existingPlan.sqft = sqft;
        if (stories !== undefined) existingPlan.stories = stories;
        if (price_per_sqft !== undefined) existingPlan.price_per_sqft = price_per_sqft;
        if (beds !== undefined) existingPlan.beds = beds;
        if (baths !== undefined) existingPlan.baths = baths;
        if (address !== undefined) existingPlan.address = address;
        if (design_number !== undefined) existingPlan.design_number = design_number;

        await existingPlan.save();
        results.push(existingPlan);
      } else {
        // Create new plan
        const newPlan = new Plan({
          plan_name,
          price,
          sqft,
          stories,
          price_per_sqft,
          company,
          community,
          type,
          beds,
          baths,
          address,
          design_number,
          last_updated: new Date(),
        });

        await newPlan.save();
        results.push(newPlan);
      }
    }

    return NextResponse.json(
      { message: 'Plans processed successfully', count: results.length },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to save plans', message: error.message },
      { status: 500 }
    );
  }
}

