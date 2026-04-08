import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument, BookingStatus } from './booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private readonly appGateway: AppGateway,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<BookingDocument> {
    const { resourceId, startTime, endTime } = createBookingDto;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new BadRequestException('startTime must be before endTime');
    }

    // Availability check: look for any overlapping confirmed/pending bookings
    const conflict = await this.bookingModel.findOne({
      resourceId,
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } },
      ],
    });

    if (conflict) {
      throw new ConflictException(
        `Resource "${resourceId}" is already booked for this time slot.`,
      );
    }

    const newBooking = new this.bookingModel({
      ...createBookingDto,
      startTime: start,
      endTime: end,
    });

    const saved = await newBooking.save();

    // Broadcast real-time update
    this.appGateway.broadcastBookingUpdate({
      event: 'booking:created',
      booking: saved,
    });

    return saved;
  }

  async findAll(): Promise<BookingDocument[]> {
    return this.bookingModel.find().sort({ startTime: 1 }).exec();
  }

  async findByUser(userId: string): Promise<BookingDocument[]> {
    return this.bookingModel
      .find({ userId })
      .sort({ startTime: 1 })
      .exec();
  }

  async findOne(id: string): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(id).exec();
    if (!booking) {
      throw new NotFoundException(`Booking #${id} not found`);
    }
    return booking;
  }

  async updateStatus(
    id: string,
    updateBookingDto: UpdateBookingDto,
  ): Promise<BookingDocument> {
    const { version, status } = updateBookingDto;

    // Optimistic locking: only update if version matches
    const updated = await this.bookingModel
      .findOneAndUpdate(
        { _id: id, version },
        { $set: { status }, $inc: { version: 1 } },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException(
        'Booking was modified by another request. Please refresh and try again.',
      );
    }

    // Broadcast real-time update
    this.appGateway.broadcastBookingUpdate({
      event: 'booking:updated',
      booking: updated,
    });

    return updated;
  }

  async cancel(id: string, userId: string, isAdmin: boolean): Promise<BookingDocument> {
    const booking = await this.findOne(id);

    if (!isAdmin && booking.userId !== userId) {
      throw new BadRequestException('You can only cancel your own bookings.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled.');
    }

    const updated = await this.bookingModel
      .findOneAndUpdate(
        { _id: id, version: booking.version },
        { $set: { status: BookingStatus.CANCELLED }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException(
        'Booking was modified concurrently. Please retry.',
      );
    }

    // Broadcast real-time update
    this.appGateway.broadcastBookingUpdate({
      event: 'booking:cancelled',
      booking: updated,
    });

    return updated;
  }

  async getAvailableSlots(
    resourceId: string,
    date: string,
  ): Promise<{ start: string; end: string; available: boolean }[]> {
    const day = new Date(date);
    const dayStart = new Date(day.setHours(8, 0, 0, 0));
    const dayEnd = new Date(day.setHours(20, 0, 0, 0));

    const existingBookings = await this.bookingModel
      .find({
        resourceId,
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        startTime: { $gte: dayStart },
        endTime: { $lte: dayEnd },
      })
      .exec();

    // Generate 1-hour slots from 08:00 to 20:00
    const slots: { start: string; end: string; available: boolean }[] = [];
    const slotStart = new Date(dayStart);

    while (slotStart < dayEnd) {
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
      const isBooked = existingBookings.some(
        (b) =>
          new Date(b.startTime) < slotEnd &&
          new Date(b.endTime) > slotStart,
      );
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: !isBooked,
      });
      slotStart.setTime(slotEnd.getTime());
    }

    return slots;
  }
}