import { DataSource } from 'typeorm';
import { Organization } from 'src/models/organization.entity';

export class OrganizationsSeed {
    public static async run(dataSource: DataSource): Promise<void> {
        const organizationRepository = dataSource.getRepository(Organization);

        const organizations = [
            {
                name: 'landlord',
                slug: 'landlord',
                status: true,
            },
        ];

        for (const orgData of organizations) {
            const existingOrg = await organizationRepository.findOne({
                where: [{ name: orgData.name }, { slug: orgData.slug }],
            });

            if (!existingOrg) {
                await organizationRepository.save(orgData);
                console.log(`✅ Organization ${orgData.name} created`);
            }
        }
    }
}
