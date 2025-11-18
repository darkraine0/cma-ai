import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);

