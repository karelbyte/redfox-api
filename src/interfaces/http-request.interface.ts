import { ApiOptions, ApiRequest } from "../types/axios-api-request.type";


export interface IHttpRequest {
	get<T>(url: string, options?: ApiOptions): Promise<T>;
	post<T>(url: string, data: ApiRequest, options?: ApiOptions): Promise<T>;
	put<T>(url: string, data: ApiRequest, options?: ApiOptions): Promise<T>;
}