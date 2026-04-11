import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class SendQuotationEmailDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];

  @IsOptional()
  @IsString()
  message?: string;
  
  @IsOptional()
  @IsString()
  locale?: string;
}
