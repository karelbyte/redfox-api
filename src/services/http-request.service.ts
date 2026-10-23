import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { IHttpRequest } from '../interfaces/http-request.interface';
import { ApiRequest } from '../types/axios-api-request.type';

@Injectable()
export class HttpService implements IHttpRequest {
  private readonly instance: AxiosInstance;
  private readonly defaultTimeout = 10000;

  constructor() {
    this.instance = axios.create({
      timeout: this.defaultTimeout,
      validateStatus: (status: number) => status >= 200 && status < 500,
    });

    // 🔹 Interceptor de respuesta
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        // 👇 Aquí errores reales (timeout, 500, etc.)
        const status =
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          error.response?.data?.message ||
          error.response?.data ||
          error.message ||
          'Unexpected error';

        throw new HttpException(
          {
            message,
            statusCode: status,
          },
          status,
        );
      },
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.get(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: ApiRequest,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.post(
      url,
      data,
      config,
    );
    return response.data;
  }

  async put<T>(
    url: string,
    data?: ApiRequest,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.put(
      url,
      data,
      config,
    );
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: ApiRequest,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.patch(
      url,
      data,
      config,
    );
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.delete(url, config);
    return response.data;
  }
}
