import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPriceHistory extends Document {
  plan_id: Types.ObjectId;
  old_price: number;
  new_price: number;
  changed_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PriceHistorySchema = new Schema<IPriceHistory>(
  {
    plan_id: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    old_price: {
      type: Number,
      required: true,
    },
    new_price: {
      type: Number,
      required: true,
    },
    changed_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PriceHistory || mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);

