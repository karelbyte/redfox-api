import { IsString, IsNotEmpty, Length } from 'class-validator';

export class SendUserMessageDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 1000, {
    message: 'El mensaje debe tener entre 10 y 1000 caracteres',
  })
  message: string;
}
