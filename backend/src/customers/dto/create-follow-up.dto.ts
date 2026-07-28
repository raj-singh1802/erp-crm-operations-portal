import { IsString, MinLength } from 'class-validator';

export class CreateFollowUpDto {
  @IsString()
  @MinLength(1)
  note: string;
}
