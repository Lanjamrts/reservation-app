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

  async findAll(): Promise<PaymentDocument[]> {
    return this.paymentModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByBooking(bookingId: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ bookingId }).exec();
  }

  async findByUser(userId: string): Promise<PaymentDocument[]> {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 }).exec();
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
    const payments = await this.paymentModel.find().exec();
    const paid = payments.filter(p => p.status === PaymentStatus.PAID);
    const pending = payments.filter(p => p.status === PaymentStatus.PENDING);

    const totalRevenue = paid.reduce((sum, p) => sum + p.amount, 0);
    const pendingRevenue = pending.reduce((sum, p) => sum + p.amount, 0);

    // Monthly revenue for the last 6 months
    const monthlyMap = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, 0);
    }
    paid.forEach(p => {
      if (p.paidAt) {
        const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap.has(key)) {
          monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + p.amount);
        }
      }
    });

    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));

    return {
      totalRevenue,
      pendingRevenue,
      totalPayments: payments.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      monthlyRevenue,
    };
  }
}
