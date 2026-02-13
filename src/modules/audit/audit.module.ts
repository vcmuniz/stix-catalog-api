import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogConsumer } from './consumers/audit-log.consumer';
import { AuditController } from './audit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogConsumer],
  controllers: [AuditController],
  exports: [TypeOrmModule],
})
export class AuditModule {}
