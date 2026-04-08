import { IsString, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateBookingDto {
  // ✅ Injectés automatiquement par le controller depuis le JWT — pas envoyés par le frontend
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @IsString()
  @IsNotEmpty()
  resourceName: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  notes?: string;
}