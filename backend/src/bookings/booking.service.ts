import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument, BookingStatus, PaymentStatus } from './booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AppGateway } from '../gateway/app.gateway';
import { PaymentService } from '../payments/payment.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private readonly appGateway: AppGateway,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<BookingDocument> {
    const { resourceId, startTime, endTime } = createBookingDto;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const conflict = await this.bookingModel.findOne({
      resourceId,
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      $or: [{ startTime: { $lt: end }, endTime: { $gt: start } }],
    });

    if (conflict) {
      throw new ConflictException(`Cette salle est déjà réservée pour ce créneau.`);
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const pricePerHour = (createBookingDto as any).pricePerHour ?? 0;
    const paymentAmount = Math.round(durationHours * pricePerHour);
    const depositAmount = Math.round(paymentAmount * 0.3);
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 90000) + 10000}`;

    const newBooking = new this.bookingModel({
      ...createBookingDto,
      startTime: start,
      endTime: end,
      paymentAmount,
      depositAmount,
      invoiceNumber,
      paymentStatus: PaymentStatus.UNPAID,
    });

    const saved = await newBooking.save();

    if (paymentAmount > 0) {
      await this.paymentService.create({
        bookingId: saved._id.toString(),
        userId: saved.userId,
        userName: saved.userName,
        resourceName: saved.resourceName,
        amount: paymentAmount,
        deposit: depositAmount,
      });
    }

    const userEmail = (createBookingDto as any).userEmail;
    if (userEmail) {
      this.notificationService.sendNotification({
        to: userEmail,
        userName: saved.userName,
        resourceName: saved.resourceName,
        startTime: saved.startTime,
        endTime: saved.endTime,
        invoiceNumber,
        amount: paymentAmount,
        type: 'booking_confirmed',
      }).catch(() => {});
    }

    this.appGateway.broadcastBookingUpdate({ event: 'booking:created', booking: saved });
    return saved;
  }

  async findAll(): Promise<BookingDocument[]> {
    return this.bookingModel.find().sort({ startTime: 1 }).exec();
  }

  async findByUser(userId: string): Promise<BookingDocument[]> {
    return this.bookingModel.find({ userId }).sort({ startTime: 1 }).exec();
  }

  async findByResource(resourceId: string): Promise<BookingDocument[]> {
    return this.bookingModel
      .find({ resourceId, status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } })
      .sort({ startTime: 1 })
      .exec();
  }

  async findOne(id: string): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(id).exec();
    if (!booking) throw new NotFoundException(`Booking #${id} not found`);
    return booking;
  }

  async updateStatus(id: string, updateBookingDto: UpdateBookingDto): Promise<BookingDocument> {
    const { version, status } = updateBookingDto;
    const updated = await this.bookingModel
      .findOneAndUpdate(
        { _id: id, version },
        { $set: { status }, $inc: { version: 1 } },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      throw new ConflictException('Réservation modifiée par une autre requête.');
    }

    this.appGateway.broadcastBookingUpdate({ event: 'booking:updated', booking: updated });
    return updated;
  }

  async cancel(id: string, userId: string, isAdmin: boolean): Promise<BookingDocument> {
    const booking = await this.findOne(id);

    if (!isAdmin && booking.userId !== userId) {
      throw new BadRequestException('Vous ne pouvez annuler que vos propres réservations.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cette réservation est déjà annulée.');
    }

    const updated = await this.bookingModel
      .findOneAndUpdate(
        { _id: id, version: booking.version },
        { $set: { status: BookingStatus.CANCELLED }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();

    if (!updated) throw new ConflictException('Conflit de modification. Veuillez réessayer.');

    this.appGateway.broadcastBookingUpdate({ event: 'booking:cancelled', booking: updated });
    return updated;
  }

  async getStats() {
    const all = await this.bookingModel.find().exec();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const confirmed = all.filter(b => b.status === BookingStatus.CONFIRMED);

    return {
      total: all.length,
      pending: all.filter(b => b.status === BookingStatus.PENDING).length,
      confirmed: confirmed.length,
      cancelled: all.filter(b => b.status === BookingStatus.CANCELLED).length,
      occupancyRate: all.length > 0 ? Math.round((confirmed.length / all.length) * 100) : 0,
      todayBookings: all.filter(b =>
        new Date(b.startTime) >= today && new Date(b.startTime) < tomorrow
      ).length,
    };
  }

  async getAvailableSlots(resourceId: string, date: string) {
    const day = new Date(date);
    const dayStart = new Date(day.setHours(8, 0, 0, 0));
    const dayEnd = new Date(day.setHours(20, 0, 0, 0));

    const existingBookings = await this.bookingModel.find({
      resourceId,
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      startTime: { $gte: dayStart },
      endTime: { $lte: dayEnd },
    }).exec();

    const slots: { start: string; end: string; available: boolean }[] = [];
    const slotStart = new Date(dayStart);

    while (slotStart < dayEnd) {
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: !existingBookings.some(
          b => new Date(b.startTime) < slotEnd && new Date(b.endTime) > slotStart,
        ),
      });
      slotStart.setTime(slotEnd.getTime());
    }
    return slots;
  }
}