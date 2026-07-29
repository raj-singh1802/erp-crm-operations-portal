import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { ProductsImageService } from './products-image.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private productsImageService: ProductsImageService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS)
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.update(id, dto, user.role);
  }

  @Get(':id/stock-movements')
  @Roles(Role.ADMIN, Role.WAREHOUSE, Role.ACCOUNTS)
  getStockMovements(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.getStockMovements(id);
  }

  @Post(':id/image')
  @Roles(Role.ADMIN, Role.WAREHOUSE)
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.OK)
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const imageUrl = await this.productsImageService.upload(file);
    return this.productsService.update(id, { imageUrl } as any, user.role);
  }

  @Post(':id/stock-movements')
  @Roles(Role.ADMIN, Role.WAREHOUSE)
  @HttpCode(HttpStatus.CREATED)
  createStockMovement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.createStockMovement(id, dto, user.id);
  }
}
