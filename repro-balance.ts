
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AccountPayableService } from './src/services/account-payable.service';
import { AccountPayableStatus } from './src/models/account-payable.entity';
import { TenantContext } from './src/services/tenant-context.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(AccountPayableService);
    const tenantContext = app.get(TenantContext);

    // Mock organization context
    // We need a real organization ID from the database
    const orgId = '1ef3cad5-00c7-6e60-843c-396590230000'; // Replace with a valid one if needed
    (tenantContext as any).setOrganizationId(orgId);

    console.log('--- REPRODUCTION START ---');

    try {
        const data = {
            referenceNumber: 'TEST-' + Date.now(),
            providerId: '1ef3cad5-0453-61a0-971c-396590230000', // Replace with a valid provider ID
            totalAmount: 2000,
            remainingAmount: 1600,
            issueDate: '2024-03-09',
            dueDate: '2024-04-09',
            notes: 'Test for paidAmount persistence',
        };

        console.log('Creating account with:', data);
        const account = await service.create(data as any);

        console.log('Returned from create:', {
            id: account.id,
            totalAmount: account.totalAmount,
            remainingAmount: account.remainingAmount,
            paidAmount: account.paidAmount,
            status: account.status
        });

        // Fetch again from DB to be 100% sure
        const fetched = await service.findOne(account.id);
        console.log('Fetched from DB:', {
            id: fetched.id,
            totalAmount: fetched.totalAmount,
            remainingAmount: fetched.remainingAmount,
            paidAmount: fetched.paidAmount,
            status: fetched.status
        });

        if (Number(fetched.paidAmount) === 400) {
            console.log('SUCCESS: paidAmount IS 400');
        } else {
            console.log('FAILURE: paidAmount IS', fetched.paidAmount);
        }

    } catch (error) {
        console.error('Error during reproduction:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
