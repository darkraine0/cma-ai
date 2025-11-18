import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  plan_name: string;
  price: number;
  sqft?: number;
  stories?: string;
  price_per_sqft?: number;
  last_updated: Date;
  company: string;
  community: string;
  type: 'plan' | 'now';
  beds?: string;
  baths?: string;
  address?: string;
  design_number?: string;
  price_changed_recently?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    plan_name: {
      type: String,
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    sqft: {
      type: Number,
    },
    stories: {
      type: String,
    },
    price_per_sqft: {
      type: Number,
    },
    last_updated: {
      type: Date,
      default: Date.now,
    },
    company: {
      type: String,
      required: true,
      index: true,
    },
    community: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['plan', 'now'],
      required: true,
      default: 'plan',
      index: true,
    },
    beds: {
      type: String,
    },
    baths: {
      type: String,
    },
    address: {
      type: String,
    },
    design_number: {
      type: String,
    },
    price_changed_recently: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for uniqueness
PlanSchema.index({ plan_name: 1, company: 1, community: 1, type: 1 }, { unique: true });

export default mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);

