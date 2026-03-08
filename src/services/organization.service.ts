import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../models/organization.entity';

@Injectable()
export class OrganizationService {
    constructor(
        @InjectRepository(Organization)
        private organizationRepository: Repository<Organization>,
    ) { }

    async create(data: Partial<Organization>): Promise<Organization> {
        const organization = this.organizationRepository.create(data);
        return await this.organizationRepository.save(organization);
    }

    async findBySlug(slug: string): Promise<Organization | null> {
        return await this.organizationRepository.findOne({ where: { slug } });
    }

    async findOne(id: string): Promise<Organization | null> {
        return await this.organizationRepository.findOne({ where: { id } });
    }
}
