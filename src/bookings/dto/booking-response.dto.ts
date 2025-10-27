import { ApiProperty } from '@nestjs/swagger';

/**
 * BookingResponseDto
 *
 * DTO для ответа с информацией о бронировании
 */
export class BookingResponseDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Event ID',
    example: 1,
  })
  event_id: number;

  @ApiProperty({
    description: 'User identifier',
    example: 'user123',
  })
  user_id: string;

  @ApiProperty({
    description: 'Booking creation timestamp',
    example: '2025-01-15T10:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Success message',
    example: 'Booking created successfully',
    required: false,
  })
  message?: string;
}
