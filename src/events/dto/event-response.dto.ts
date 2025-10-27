import { ApiProperty } from '@nestjs/swagger';

/**
 * EventResponseDto
 *
 * DTO для ответа с информацией о событии
 */
export class EventResponseDto {
  @ApiProperty({
    description: 'Unique event identifier',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Event name',
    example: 'Tech Conference 2025',
  })
  name: string;

  @ApiProperty({
    description: 'Total number of seats',
    example: 100,
  })
  total_seats: number;

  @ApiProperty({
    description: 'Event creation timestamp',
    example: '2025-01-15T10:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Available seats (only in detailed view)',
    example: 85,
    required: false,
  })
  available_seats?: number;
}
