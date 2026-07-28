import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsImageService } from './products-image.service';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsImageService],
})
export class ProductsModule {}
