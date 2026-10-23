import { ProductRepository } from "../repositories/product.repository";
import { HttpService } from "../services/http-request.service";
import { SunatApiRequestService } from "../services/sunat-api-request.service";
import { HTTP_REQUEST, PRODUCT_REPOSITORY, SUNAT_API_SERVICE } from "./inject-tokens";

export const httpRequest = {
    provide: HTTP_REQUEST,
    useClass: HttpService
}

export const productRepository = {
    provide: PRODUCT_REPOSITORY,
    useClass: ProductRepository
}

export const sunatApiService = {
    provide: SUNAT_API_SERVICE,
    useClass: SunatApiRequestService
}