import { Module } from '@nestjs/common';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';
import { JwtModule } from '../common/jwt/jwt.module';

@Module({
  imports: [JwtModule],
  controllers: [TodosController],
  providers: [TodosService],
})
export class TodosModule {}
