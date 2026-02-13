import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Controller('audit-logs')
export class AuditController {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs',
    schema: {
      example: [
        {
          id: 'uuid',
          entityType: 'Product',
          entityId: 'product-uuid',
          eventType: 'CREATED',
          payload: { name: 'Product Name', status: 'DRAFT' },
          createdAt: '2026-02-12T17:00:00Z',
        },
      ],
    },
  })
  async findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('eventType') eventType?: string,
    @Query('limit') limit?: number,
  ) {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (entityType) {
      query.andWhere('audit.entityType = :entityType', { entityType });
    }

    if (entityId) {
      query.andWhere('audit.entityId = :entityId', { entityId });
    }

    if (eventType) {
      query.andWhere('audit.eventType = :eventType', { eventType });
    }

    query.orderBy('audit.createdAt', 'DESC');

    if (limit) {
      query.limit(limit);
    } else {
      query.limit(100);
    }

    return query.getMany();
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs for the entity',
  })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogRepository.find({
      where: {
        entityType,
        entityId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit || 50,
    });
  }

  @Get('event/:eventType')
  @ApiOperation({ summary: 'Get audit logs by event type' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs filtered by event type',
  })
  async findByEventType(
    @Param('eventType') eventType: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogRepository.find({
      where: {
        eventType,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit || 50,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get audit logs summary' })
  @ApiResponse({
    status: 200,
    description: 'Summary of audit logs by entity and event type',
  })
  async getSummary() {
    const logs = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.entityType', 'entityType')
      .addSelect('audit.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.entityType, audit.eventType')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return {
      total: logs.reduce((sum, log) => sum + parseInt(log.count), 0),
      byType: logs,
    };
  }
}
