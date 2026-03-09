import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../src/models/product.entity';
import { User } from '../src/models/user.entity';
import { Category } from '../src/models/category.entity';
import { Brand } from '../src/models/brand.entity';
import { MeasurementUnit } from '../src/models/measurement-unit.entity';
import {
  createTestProduct,
  createTestUser,
  clearDatabase,
  generateTestToken,
} from './test-utils';
import * as bcrypt from 'bcrypt';

describe('ProductController (e2e)', () => {
  let app: INestApplication;
  let productRepository: Repository<Product>;
  let userRepository: Repository<User>;
  let categoryRepository: Repository<Category>;
  let brandRepository: Repository<Brand>;
  let measurementUnitRepository: Repository<MeasurementUnit>;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    productRepository = moduleFixture.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    categoryRepository = moduleFixture.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
    brandRepository = moduleFixture.get<Repository<Brand>>(
      getRepositoryToken(Brand),
    );
    measurementUnitRepository = moduleFixture.get<Repository<MeasurementUnit>>(
      getRepositoryToken(MeasurementUnit),
    );

    await app.init();
  });

  beforeEach(async () => {
    await clearDatabase([
      productRepository,
      userRepository,
      categoryRepository,
      brandRepository,
      measurementUnitRepository,
    ]);

    // Crear usuario de prueba y obtener token
    const password = 'testPassword123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = createTestUser({ password: hashedPassword });

    const user = userRepository.create(userData);
    const savedUser = await userRepository.save(user);

    // Generar token JWT
    authToken = generateTestToken({
      sub: savedUser.id,
      email: savedUser.email,
    });

    // Crear datos de referencia
    const category = categoryRepository.create({
      name: 'Test Category',
      description: 'Test category description',
    });
    await categoryRepository.save(category);

    const brand = brandRepository.create({
      name: 'Test Brand',
      description: 'Test brand description',
    });
    await brandRepository.save(brand);

    const measurementUnit = measurementUnitRepository.create({
      name: 'Unit',
      abbreviation: 'u',
    });
    await measurementUnitRepository.save(measurementUnit);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/products (GET)', () => {
    it('should return paginated products', async () => {
      // Arrange
      const product1 = productRepository.create(createTestProduct());
      const product2 = productRepository.create(
        createTestProduct({
          name: 'Product 2',
          barcode: '0987654321',
        }),
      );

      await productRepository.save([product1, product2]);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter products by search term', async () => {
      // Arrange
      const product1 = productRepository.create(
        createTestProduct({ name: 'Laptop Dell' }),
      );
      const product2 = productRepository.create(
        createTestProduct({
          name: 'Mouse Logitech',
          barcode: '0987654321',
        }),
      );

      await productRepository.save([product1, product2]);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/products?search=Laptop')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('Laptop');
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act & Assert
      await request(app.getHttpServer()).get('/products').expect(401);
    });
  });

  describe('/products (POST)', () => {
    it('should create a new product successfully', async () => {
      // Arrange
      const category = await categoryRepository.findOne({ where: {} });
      const brand = await brandRepository.findOne({ where: {} });
      const measurementUnit = await measurementUnitRepository.findOne({
        where: {},
      });

      const createProductDto = {
        name: 'New Product',
        description: 'New product description',
        price: 150.0,
        cost: 75.0,
        stock: 20,
        minStock: 5,
        barcode: '1111111111',
        categoryId: category.id,
        brandId: brand.id,
        measurementUnitId: measurementUnit.id,
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProductDto)
        .expect(201);

      expect(response.body.name).toBe(createProductDto.name);
      expect(response.body.price).toBe(createProductDto.price);
      expect(response.body.barcode).toBe(createProductDto.barcode);

      // Verificar que el producto fue creado en la base de datos
      const createdProduct = await productRepository.findOneBy({
        barcode: createProductDto.barcode,
      });
      expect(createdProduct).toBeDefined();
    });

    it('should return 400 for duplicate barcode', async () => {
      // Arrange
      const existingProduct = productRepository.create(createTestProduct());
      await productRepository.save(existingProduct);

      const createProductDto = {
        name: 'New Product',
        description: 'New product description',
        price: 150.0,
        cost: 75.0,
        stock: 20,
        minStock: 5,
        barcode: existingProduct.barcode, // Mismo código de barras
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProductDto)
        .expect(400);

      expect(response.body.message).toContain('Barcode already exists');
    });

    it('should return 400 for invalid data', async () => {
      // Arrange
      const createProductDto = {
        name: '', // Nombre vacío
        price: -10, // Precio negativo
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProductDto)
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });
  });

  describe('/products/:id (GET)', () => {
    it('should return product by id', async () => {
      // Arrange
      const product = productRepository.create(createTestProduct());
      const savedProduct = await productRepository.save(product);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/products/${savedProduct.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(savedProduct.id);
      expect(response.body.name).toBe(savedProduct.name);
    });

    it('should return 404 for non-existent product', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/products/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/products/:id (PUT)', () => {
    it('should update product successfully', async () => {
      // Arrange
      const product = productRepository.create(createTestProduct());
      const savedProduct = await productRepository.save(product);

      const updateProductDto = {
        name: 'Updated Product Name',
        price: 200.0,
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .put(`/products/${savedProduct.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateProductDto)
        .expect(200);

      expect(response.body.name).toBe(updateProductDto.name);
      expect(response.body.price).toBe(updateProductDto.price);

      // Verificar que el producto fue actualizado en la base de datos
      const updatedProduct = await productRepository.findOneBy({
        id: savedProduct.id,
      });
      expect(updatedProduct.name).toBe(updateProductDto.name);
    });

    it('should return 404 for non-existent product', async () => {
      // Arrange
      const updateProductDto = {
        name: 'Updated Product Name',
      };

      // Act & Assert
      await request(app.getHttpServer())
        .put('/products/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateProductDto)
        .expect(404);
    });
  });

  describe('/products/:id/stock (PATCH)', () => {
    it('should update product stock successfully', async () => {
      // Arrange
      const product = productRepository.create(
        createTestProduct({ stock: 10 }),
      );
      const savedProduct = await productRepository.save(product);

      const updateStockDto = {
        quantity: 5,
        operation: 'add',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .patch(`/products/${savedProduct.id}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateStockDto)
        .expect(200);

      expect(response.body.stock).toBe(15); // 10 + 5

      // Verificar que el stock fue actualizado en la base de datos
      const updatedProduct = await productRepository.findOneBy({
        id: savedProduct.id,
      });
      expect(updatedProduct.stock).toBe(15);
    });

    it('should subtract stock correctly', async () => {
      // Arrange
      const product = productRepository.create(
        createTestProduct({ stock: 10 }),
      );
      const savedProduct = await productRepository.save(product);

      const updateStockDto = {
        quantity: 3,
        operation: 'subtract',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .patch(`/products/${savedProduct.id}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateStockDto)
        .expect(200);

      expect(response.body.stock).toBe(7); // 10 - 3
    });

    it('should return 400 for insufficient stock', async () => {
      // Arrange
      const product = productRepository.create(createTestProduct({ stock: 5 }));
      const savedProduct = await productRepository.save(product);

      const updateStockDto = {
        quantity: 10,
        operation: 'subtract',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .patch(`/products/${savedProduct.id}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateStockDto)
        .expect(400);

      expect(response.body.message).toContain('Insufficient stock');
    });
  });

  describe('/products/:id (DELETE)', () => {
    it('should soft delete product successfully', async () => {
      // Arrange
      const product = productRepository.create(createTestProduct());
      const savedProduct = await productRepository.save(product);

      // Act & Assert
      await request(app.getHttpServer())
        .delete(`/products/${savedProduct.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verificar que el producto fue marcado como inactivo
      const deletedProduct = await productRepository.findOneBy({
        id: savedProduct.id,
      });
      expect(deletedProduct.isActive).toBe(false);
    });

    it('should return 404 for non-existent product', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .delete('/products/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/products/low-stock (GET)', () => {
    it('should return products with low stock', async () => {
      // Arrange
      const lowStockProduct = productRepository.create(
        createTestProduct({
          stock: 2,
          minStock: 5,
        }),
      );
      const normalStockProduct = productRepository.create(
        createTestProduct({
          name: 'Normal Stock Product',
          barcode: '0987654321',
          stock: 10,
          minStock: 5,
        }),
      );

      await productRepository.save([lowStockProduct, normalStockProduct]);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/products/low-stock')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].stock).toBeLessThanOrEqual(
        response.body[0].minStock,
      );
    });
  });
});
