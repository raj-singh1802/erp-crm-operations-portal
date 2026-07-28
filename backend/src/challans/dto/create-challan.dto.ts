import { IsInt, IsArray, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChallanItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateChallanDto {
  @IsInt()
  customerId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChallanItemDto)
  items: CreateChallanItemDto[];
}
