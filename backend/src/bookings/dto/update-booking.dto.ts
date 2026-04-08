import { IsEnum, IsNumber } from 'class-validator';
import { BookingStatus } from '../booking.schema';

export class UpdateBookingDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @IsNumber()
  version: number;
}