import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BookingDocument = Booking & Document;

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

@Schema({
  timestamps: true,
  versionKey: 'version', // Optimistic locking via __v renamed to 'version'
  optimisticConcurrency: true,
})
export class Booking {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  resourceId: string;

  @Prop({ required: true })
  resourceName: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({
    type: String,
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Prop({ default: 0 })
  version: number;

  @Prop()
  notes?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Index to prevent double bookings on the same resource/time
BookingSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });

// Middleware for optimistic locking check
BookingSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() as any;
  if (update && update.version !== undefined) {
    this.setQuery({
      ...this.getQuery(),
      version: update.version,
    });
    update.$inc = { version: 1 };
    delete update.version;
  }
});