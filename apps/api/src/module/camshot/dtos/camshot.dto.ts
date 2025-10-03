import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CamshotUploadDto {
  @ApiProperty({
    example: 'camshot.jpg',
    description: 'Title of the camshot',
  })
  @IsString()
  @Optional()
  title?: string;

  @ApiProperty({
    example: 45.5,
    description: 'Duration in seconds (optional)',
    required: false,
  })
  @IsNumber()
  @Optional()
  duration?: number;

  @ApiProperty({
    example: 'folder_abc123',
    description: 'ID of parent folder (optional)',
    required: false,
  })
  @IsString()
  @Optional()
  folderId?: string;
}
