import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import connectDB from '@/app/lib/mongodb';
import Company from '@/app/models/Company';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    await connectDB();
    const body = await request.json();
    const { companyName } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ 
      name: { $regex: new RegExp(`^${companyName.trim()}$`, 'i') } 
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company already exists', company: existingCompany },
        { status: 409 }
      );
    }

    // Fetch company information from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides information about home building companies. Provide accurate, factual information in JSON format. Return ONLY valid JSON, no additional text.',
        },
        {
          role: 'user',
          content: `Provide information about the home building company "${companyName}". Return a JSON object with the following fields: name (exact company name), description (brief overview of the company), website (official website URL if known, otherwise null), headquarters (city and state, e.g., "Dallas, Texas"), and founded (year founded if known, otherwise null). Only return the JSON object, no additional text.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to get response from OpenAI' },
        { status: 500 }
      );
    }

    let companyData;
    try {
      companyData = JSON.parse(aiResponse);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: aiResponse },
        { status: 500 }
      );
    }

    // Ensure the name matches what was requested
    companyData.name = companyName.trim();

    // Create the company in database
    const company = new Company({
      name: companyData.name,
      description: companyData.description || null,
      website: companyData.website || null,
      headquarters: companyData.headquarters || null,
      founded: companyData.founded || null,
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
    
    // Handle OpenAI API errors
    if (error.response) {
      return NextResponse.json(
        { error: 'OpenAI API error', message: error.response.data?.error?.message || error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create company with AI', message: error.message },
      { status: 500 }
    );
  }
}

