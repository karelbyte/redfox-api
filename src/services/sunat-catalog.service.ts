import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SunatProductCode } from '../models/sunat-product-code.entity';

export interface ProductCodeSuggestion {
  key: string;
  description: string;
  /** Verdadero si SUNAT exige este código para el bien. */
  restricted?: boolean;
}

const SEARCH_LIMIT = 20;

/**
 * Busca en el Catálogo 25 de SUNAT, que vive en nuestra base.
 *
 * A diferencia del catálogo mexicano —que se consulta a un servicio externo
 * en cada búsqueda— aquí los datos son propios: no hay latencia de red, ni
 * dependencia de que un tercero esté disponible para poder dar de alta un
 * producto. Sobre 19.475 filas el índice de trigramas responde en unos pocos
 * milisegundos.
 */
@Injectable()
export class SunatCatalogService {
  constructor(
    @InjectRepository(SunatProductCode)
    private readonly repository: Repository<SunatProductCode>,
  ) {}

  async searchProductCodes(term: string): Promise<ProductCodeSuggestion[]> {
    const search = term?.trim();
    if (!search) return [];

    /*
     * Se busca por descripción y por código a la vez: quien ya conoce el
     * código lo teclea, y quien no, escribe el nombre.
     *
     * `immutable_unaccent` permite que "platano" encuentre "PLÁTANO", y es la
     * misma expresión con la que está construido el índice: escribirla
     * distinto aquí haría que Postgres no lo usara.
     *
     * El orden pone primero lo más parecido, y entre parecidos la descripción
     * más corta, que casi siempre es el término genérico que la persona
     * buscaba: ante "naranja", primero NARANJA y después PURE DE NARANJA.
     */
    const rows = await this.repository.query(
      `SELECT code, description, is_restricted
         FROM sunat_product_codes
        WHERE immutable_unaccent(lower(description))
              LIKE '%' || immutable_unaccent(lower($1)) || '%'
           OR code LIKE $1 || '%'
        ORDER BY is_restricted DESC,
                 similarity(
                   immutable_unaccent(lower(description)),
                   immutable_unaccent(lower($1))
                 ) DESC,
                 length(description) ASC
        LIMIT ${SEARCH_LIMIT}`,
      [search],
    );

    return rows.map((row: any) => ({
      key: row.code,
      description: row.description,
      ...(row.is_restricted ? { restricted: true } : {}),
    }));
  }

  /** Cuántos códigos hay sembrados. Sirve para comprobar la siembra. */
  async count(): Promise<number> {
    return this.repository.count();
  }
}
