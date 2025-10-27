import { IsInt, IsPositive, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateBookingDto
 *
 * DTO для создания нового бронирования
 */
export class CreateBookingDto {
  @ApiProperty({
    description: 'Event ID to book',
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: 'Event ID must be an integer' })
  @IsPositive({ message: 'Event ID must be positive' })
  event_id: number;

  @ApiProperty({
    description: 'User identifier',
    example: 'user123',
    minLength: 1,
    maxLength: 255,
  })
  @IsString({ message: 'User ID must be a string' })
  @MinLength(1, { message: 'User ID cannot be empty' })
  @MaxLength(255, { message: 'User ID is too long' })
  user_id: string;
}
