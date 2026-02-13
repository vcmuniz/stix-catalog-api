import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['eventType'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  entityType!: string; // Product, Category

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar', length: 100 })
  eventType!: string; // CREATED, UPDATED, ACTIVATED, etc

  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
