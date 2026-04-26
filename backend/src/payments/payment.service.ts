import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument, PaymentStatus, PaymentMethod } from './payment.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  private generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(Math.random() * 90000) + 10000;
    return `INV-${year}${month}-${rand}`;
  }

  async create(data: {
    bookingId: string;
    userId: string;
    userName: string;
    resourceName: string;
    amount: number;
    deposit?: number;
    method?: PaymentMethod;
    notes?: string;
  }): Promise<PaymentDocument> {
    const payment = new this.paymentModel({
      ...data,
      deposit: data.deposit ?? 0,
      method: data.method ?? PaymentMethod.CASH,
      invoiceNumber: this.generateInvoiceNumber(),
      status: PaymentStatus.PENDING,
    });
    return payment.save();
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async findByBooking(bookingId: string): Promise<Payment | null> {
    return this.paymentModel.findOne({ bookingId }).lean().exec();
  }

  async findByUser(userId: string): Promise<Payment[]> {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    method?: PaymentMethod,
  ): Promise<PaymentDocument> {
    const updateData: any = { status };
    if (method) updateData.method = method;
    if (status === PaymentStatus.PAID) updateData.paidAt = new Date();

    const updated = await this.paymentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updated) throw new NotFoundException(`Payment #${id} not found`);
    return updated;
  }

  async getStats(): Promise<{
    totalRevenue: number;
    pendingRevenue: number;
    totalPayments: number;
    paidCount: number;
    pendingCount: number;
    monthlyRevenue: { month: string; amount: number }[];
  }> {
    const now = new Date();
    const monthlyKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const [totalPayments, paidCount, pendingCount, revenueResults] = await Promise.all([
      this.paymentModel.countDocuments().exec(),
      this.paymentModel.countDocuments({ status: PaymentStatus.PAID }).exec(),
      this.paymentModel.countDocuments({ status: PaymentStatus.PENDING }).exec(),
      this.paymentModel.aggregate([
        {
          $match: {
            status: PaymentStatus.PAID,
            paidAt: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$paidAt' },
              month: { $month: '$paidAt' },
            },
            amount: { $sum: '$amount' },
          },
        },
      ]).exec(),
    ]);

    const monthlyRevenueMap = new Map<string, number>();
    for (const row of revenueResults as Array<{ _id: { year: number; month: number }; amount: number }>) {
      const monthKey = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
      monthlyRevenueMap.set(monthKey, row.amount);
    }

    const monthlyRevenue = monthlyKeys.map((month) => ({
      month,
      amount: monthlyRevenueMap.get(month) ?? 0,
    }));

    const totalRevenue = Array.from(monthlyRevenueMap.values()).reduce((sum, amount) => sum + amount, 0);
    const pendingRevenue = await this.paymentModel
      .aggregate([
        { $match: { status: PaymentStatus.PENDING } },
        { $group: { _id: null, amount: { $sum: '$amount' } } },
      ])
      .exec()
      .then((result) => (result[0]?.amount ?? 0));

    return {
      totalRevenue,
      pendingRevenue,
      totalPayments,
      paidCount,
      pendingCount,
      monthlyRevenue,
    };
  }
}
