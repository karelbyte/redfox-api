import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateShipmentsTable1776030297747 implements MigrationInterface {
    name = 'CreateShipmentsTable1776030297747'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."shipment_status_enum" AS ENUM ('PENDING', 'PACKING', 'SHIPPED', 'DELIVERED', 'RETURNED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "shipments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "withdrawal_id" uuid NOT NULL, "shipping_address_id" uuid, "carrier" character varying(100) NOT NULL, "tracking_number" character varying(100), "tracking_url" character varying(500), "shipping_cost" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."shipment_status_enum" NOT NULL DEFAULT 'PENDING', "estimated_delivery_date" TIMESTAMP, "shipped_at" TIMESTAMP, "delivered_at" TIMESTAMP, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_shipments_id" PRIMARY KEY ("id"))`);
        
        await queryRunner.query(`CREATE INDEX "IDX_shipments_organization" ON "shipments" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_shipments_withdrawal" ON "shipments" ("withdrawal_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_shipments_status" ON "shipments" ("status") `);
        
        await queryRunner.query(`ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_withdrawal" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_address" FOREIGN KEY ("shipping_address_id") REFERENCES "client_addresses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_address"`);
        await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_withdrawal"`);
        await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_organization"`);
        
        await queryRunner.query(`DROP INDEX "public"."IDX_shipments_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_shipments_withdrawal"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_shipments_organization"`);
        
        await queryRunner.query(`DROP TABLE "shipments"`);
        await queryRunner.query(`DROP TYPE "public"."shipment_status_enum"`);
    }
}
