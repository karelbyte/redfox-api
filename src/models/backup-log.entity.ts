import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('backup_logs')
export class BackupLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    filename: string;

    @Column({ name: 'file_size', type: 'varchar', nullable: true })
    fileSize: string;

    @Column({ type: 'boolean', default: true })
    status: boolean; // true = success, false = failure

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'trigger_type', type: 'varchar', default: 'manual' })
    triggerType: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
