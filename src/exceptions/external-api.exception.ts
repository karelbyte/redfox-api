import { HttpException, HttpStatus } from "@nestjs/common";

export class ExternalApiException extends HttpException {
  constructor(provider: string, message: string, raw?: any) {
    super(
      {
        provider,
        message,
        raw,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}