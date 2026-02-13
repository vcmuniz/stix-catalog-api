import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * Category Entity
 * 
 * Constraints de Banco de Dados:
 * - UNIQUE (name): Nomes únicos
 * - CHECK (id != parentId OR parentId IS NULL): Prevent self-reference
 * - FOREIGN KEY (parentId): Referência a category pai
 * 
 * Índices:
 * - UNIQUE (name): Para queries de criação/atualização
 * - INDEX (parentId): Para queries de hierarquia
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId!: string | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent!: Category | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

