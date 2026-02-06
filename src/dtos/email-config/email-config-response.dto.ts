export class EmailConfigResponseDto {
  id: string;
  host: string;
  port: number;
  user: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
