import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException('Product with this SKU already exists');

    return this.prisma.product.create({ data: dto as any });
  }

  async findAll(query: QueryProductDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.count({ where }),
    ]);

    const dataWithLowStock = data.map((p) => ({
      ...p,
      isLowStock: p.currentStock <= p.minStockAlert,
      unitPrice: Number(p.unitPrice),
    }));

    return {
      data: dataWithLowStock,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return { ...product, isLowStock: product.currentStock <= product.minStockAlert, unitPrice: Number(product.unitPrice) };
  }

  async update(id: number, dto: UpdateProductDto, userRole: Role) {
    await this.findOne(id);

    if (userRole === Role.WAREHOUSE) {
      const allowedFields: (keyof UpdateProductDto)[] = ['currentStock', 'minStockAlert', 'warehouseLocation'];
      const restrictedFields = Object.keys(dto).filter((k) => !allowedFields.includes(k as any));
      if (restrictedFields.length > 0) {
        throw new ForbiddenException('Warehouse can only update stock-related fields');
      }
    }

    const data: any = { ...dto };
    if (dto.unitPrice !== undefined) data.unitPrice = dto.unitPrice;

    return this.prisma.product.update({ where: { id }, data });
  }

  async getStockMovements(productId: number) {
    await this.findOne(productId);
    return this.prisma.stockMovement.findMany({
      where: { productId },
      include: { createdByUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStockMovement(productId: number, dto: CreateStockMovementDto, userId: number) {
    const product = await this.findOne(productId);

    const quantity = dto.movementType === 'OUT' ? -dto.quantityChanged : dto.quantityChanged;

    if (dto.movementType === 'OUT' && product.currentStock < dto.quantityChanged) {
      throw new ConflictException(
        `Insufficient stock. Available: ${product.currentStock}, requested: ${dto.quantityChanged}`,
      );
    }

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          productId,
          quantityChanged: dto.quantityChanged,
          movementType: dto.movementType,
          reason: dto.reason,
          createdBy: userId,
        },
      }),
      this.prisma.product.update({
        where: { id: productId },
        data: { currentStock: { increment: quantity } },
      }),
    ]);

    return movement;
  }
}
