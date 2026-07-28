import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChallanDto } from './dto/create-challan.dto';
import { QueryChallanDto } from './dto/query-challan.dto';
import { ChallanStatus, Prisma } from '@prisma/client';

@Injectable()
export class ChallansService {
  constructor(private prisma: PrismaService) {}

  private async generateChallanNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CH-${year}-`;

    const lastChallan = await this.prisma.challan.findFirst({
      where: { challanNumber: { startsWith: prefix } },
      orderBy: { challanNumber: 'desc' },
      select: { challanNumber: true },
    });

    let nextSeq = 1;
    if (lastChallan) {
      const lastNum = parseInt(lastChallan.challanNumber.slice(prefix.length), 10);
      nextSeq = lastNum + 1;
    }

    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  async create(dto: CreateChallanDto, userId: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException(`Product with id ${item.productId} not found`);
    }

    const challanNumber = await this.generateChallanNumber();
    const totalQuantity = dto.items.reduce((sum, item) => sum + item.quantity, 0);

    return this.prisma.challan.create({
      data: {
        challanNumber,
        customerId: dto.customerId,
        totalQuantity,
        status: ChallanStatus.DRAFT,
        createdBy: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            productNameSnapshot: '',
            unitPriceSnapshot: 0,
          })),
        },
      },
      include: { items: true, customer: true },
    });
  }

  async confirm(id: number) {
    const challan = await this.prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!challan) throw new NotFoundException('Challan not found');
    if (challan.status !== ChallanStatus.DRAFT) {
      throw new BadRequestException('Only draft challans can be confirmed');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const insufficient: { productId: number; available: number; requested: number }[] = [];

        const sortedItems = [...challan.items].sort((a, b) => a.productId - b.productId);

        for (const item of sortedItems) {
          await tx.$executeRaw`SELECT "currentStock" FROM "products" WHERE "id" = ${item.productId} FOR UPDATE`;

          const product = await tx.product.findUnique({ where: { id: item.productId } });

          if (!product) {
            insufficient.push({ productId: item.productId, available: 0, requested: item.quantity });
            continue;
          }

          if (product.currentStock < item.quantity) {
            insufficient.push({
              productId: item.productId,
              available: product.currentStock,
              requested: item.quantity,
            });
            continue;
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: 'OUT',
              reason: `Sales Challan #${challan.challanNumber}`,
              createdBy: challan.createdBy,
            },
          });

          const productData = await tx.product.findUnique({ where: { id: item.productId } });
          await tx.challanItem.update({
            where: { id: item.id },
            data: {
              productNameSnapshot: productData!.name,
              unitPriceSnapshot: productData!.unitPrice,
            },
          });
        }

        if (insufficient.length > 0) {
          const messages = insufficient.map(
            (i) => `Product ID ${i.productId}: requested ${i.requested}, available ${i.available}`,
          );
          throw new BadRequestException(`Insufficient stock: ${messages.join('; ')}`);
        }

        await tx.challan.update({
          where: { id },
          data: { status: ChallanStatus.CONFIRMED },
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw error;
    }

    return this.findOne(id);
  }

  async cancel(id: number) {
    const challan = await this.prisma.challan.findUnique({ where: { id } });
    if (!challan) throw new NotFoundException('Challan not found');
    if (challan.status !== ChallanStatus.DRAFT) {
      throw new BadRequestException('Only draft challans can be cancelled');
    }

    return this.prisma.challan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
    });
  }

  async findAll(query: QueryChallanDto) {
    const { page = 1, limit = 10, status, customerId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ChallanWhereInput = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          createdByUser: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.challan.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const challan = await this.prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdByUser: { select: { id: true, name: true, role: true } },
        items: {
          include: { product: { select: { id: true, sku: true } } },
        },
      },
    });
    if (!challan) throw new NotFoundException('Challan not found');
    return challan;
  }
}
