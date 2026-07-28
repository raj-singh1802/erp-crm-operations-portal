import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
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
  constructor(private productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE)
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
