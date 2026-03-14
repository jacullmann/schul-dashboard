import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './utils/encryption.service';
import { ModelService } from './utils/model.service';

@Global()
@Module({
  providers: [EncryptionService, ModelService],
  exports: [EncryptionService, ModelService],
})
export class SharedModule {}
