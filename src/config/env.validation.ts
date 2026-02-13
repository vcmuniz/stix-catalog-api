import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  DATABASE_HOST!: string;

  @IsNumber()
  DATABASE_PORT!: number;

  @IsString()
  DATABASE_USER!: string;

  @IsString()
  DATABASE_PASSWORD!: string;

  @IsString()
  DATABASE_NAME!: string;

  @IsBoolean()
  @IsOptional()
  DATABASE_SYNC: boolean = false;

  @IsBoolean()
  @IsOptional()
  DATABASE_LOGGING: boolean = false;

  @IsString()
  KAFKA_BROKERS!: string;

  @IsString()
  @IsOptional()
  KAFKA_CLIENT_ID: string = 'catalog-service';

  @IsString()
  @IsOptional()
  KAFKA_CONSUMER_GROUP: string = 'audit-service-group';

  @IsNumber()
  @IsOptional()
  KAFKA_RETRY_ATTEMPTS: number = 3;

  @IsNumber()
  @IsOptional()
  KAFKA_RETRY_DELAY: number = 5000;

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';
}
