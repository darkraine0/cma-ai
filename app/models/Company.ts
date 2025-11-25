import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  slug?: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  totalCommunities?: number; // Aggregated stats (denormalized)
  totalPlans?: number; // Aggregated stats (denormalized)
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
    },
    website: {
      type: String,
    },
    headquarters: {
      type: String,
    },
    founded: {
      type: String,
    },
    totalCommunities: {
      type: Number,
      default: 0,
    },
    totalPlans: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);

