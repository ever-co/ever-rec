import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class SoundshotUploadDto {
  @ApiProperty({
    example: 'My recording',
    description: 'Title of the soundshot',
  })
  @Optional()
  title?: string;

  @ApiProperty({
    example: 45.5,
    description: 'Duration in seconds (optional)',
    required: false,
  })
  @Optional()
  duration?: number;

  @ApiProperty({
    example: 'folder_abc123',
    description: 'ID of parent folder (optional)',
    required: false,
  })
  @Optional()
  folderId?: string;
}
