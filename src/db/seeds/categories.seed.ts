import { DataSource } from 'typeorm';
import { Category } from 'src/models/category.entity';

export class CategoriesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const categoryRepository = dataSource.getRepository(Category);

    const categories = [
      {
        slug: 'ELEC',
        name: 'Electrónicos',
        description: 'Productos electrónicos y gadgets',
        status: true,
      },
      {
        slug: 'ROPA',
        name: 'Ropa',
        description: 'Ropa y accesorios de moda',
        status: true,
      },
      {
        slug: 'HOGAR',
        name: 'Hogar',
        description: 'Artículos para el hogar',
        status: true,
      },
      {
        slug: 'DEPORTE',
        name: 'Deportes',
        description: 'Artículos deportivos y fitness',
        status: true,
      },
      {
        slug: 'BELLEZA',
        name: 'Belleza',
        description: 'Productos de belleza y cuidado personal',
        status: true,
      },
      {
        slug: 'JUGUETES',
        name: 'Juguetes',
        description: 'Juguetes y juegos',
        status: true,
      },
      {
        slug: 'LIBROS',
        name: 'Libros',
        description: 'Libros y material educativo',
        status: true,
      },
      {
        slug: 'ALIMENTOS',
        name: 'Alimentos',
        description: 'Alimentos y bebidas',
        status: true,
      },
      {
        slug: 'MASCOTAS',
        name: 'Mascotas',
        description: 'Productos para mascotas',
        status: true,
      },
      {
        slug: 'JARDIN',
        name: 'Jardín',
        description: 'Artículos para jardín y exteriores',
        status: true,
      },
    ];

    for (const category of categories) {
      const existingCategory = await categoryRepository.findOne({
        where: { slug: category.slug },
      });

      if (!existingCategory) {
        await categoryRepository.save(category);
      }
    }
  }
}
