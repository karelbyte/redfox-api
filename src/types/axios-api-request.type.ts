
export type ApiRequest = Record<string, any>;
export type ApiOptions = {
	timeout?: number;
	headers?: {
		[key: string]: string;
	};
};