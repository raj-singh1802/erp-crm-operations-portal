import { IsEnum, IsInt, IsString, Min, MinLength } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateStockMovementDto {
  @IsEnum(MovementType)
  movementType: MovementType;

  @IsInt()
  @Min(1)
  quantityChanged: number;

  @IsString()
  @MinLength(1)
  reason: string;
}
