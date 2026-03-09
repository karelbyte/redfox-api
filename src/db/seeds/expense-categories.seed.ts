import { DataSource } from 'typeorm';
import { ExpenseCategory } from '../../models/expense-category.entity';
import { Organization } from '../../models/organization.entity';

export async function seedExpenseCategories(
  dataSource: DataSource,
): Promise<void> {
  const expenseCategoryRepository = dataSource.getRepository(ExpenseCategory);
  const organizationRepository = dataSource.getRepository(Organization);

  const organization = await organizationRepository.findOneBy({
    slug: 'landlord',
  });

  if (!organization) {
    throw new Error('Landlord organization not found for seeding');
  }

  const existingCategories = await expenseCategoryRepository.count({
    where: { organization_id: organization.id },
  });
  if (existingCategories > 0) {
    console.log('Expense categories already exist, skipping seed');
    return;
  }

  const categories = [
    {
      name: 'Office Supplies',
      description: 'Office materials and supplies',
      color: '#3B82F6',
    },
    {
      name: 'Utilities',
      description: 'Electricity, water, internet, phone',
      color: '#EF4444',
    },
    {
      name: 'Rent',
      description: 'Office and warehouse rent',
      color: '#10B981',
    },
    {
      name: 'Marketing',
      description: 'Advertising and marketing expenses',
      color: '#F59E0B',
    },
    {
      name: 'Travel',
      description: 'Business travel and transportation',
      color: '#8B5CF6',
    },
    {
      name: 'Professional Services',
      description: 'Legal, accounting, consulting',
      color: '#06B6D4',
    },
    {
      name: 'Equipment',
      description: 'Office equipment and machinery',
      color: '#84CC16',
    },
    {
      name: 'Insurance',
      description: 'Business insurance premiums',
      color: '#F97316',
    },
    {
      name: 'Maintenance',
      description: 'Equipment and facility maintenance',
      color: '#EC4899',
    },
    {
      name: 'Other',
      description: 'Miscellaneous expenses',
      color: '#6B7280',
    },
  ];

  for (const categoryData of categories) {
    const category = expenseCategoryRepository.create({
      ...categoryData,
      organization_id: organization.id,
    });
    await expenseCategoryRepository.save(category);
  }

  console.log('Expense categories seeded successfully');
}
