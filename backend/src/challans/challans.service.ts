import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChallanDto } from './dto/create-challan.dto';
import { QueryChallanDto } from './dto/query-challan.dto';
import { ChallanStatus, Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';

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

  async generatePdf(id: number): Promise<Buffer> {
    const challan = await this.prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdByUser: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, sku: true } } },
        },
      },
    });
    if (!challan) throw new NotFoundException('Challan not found');

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100;
      const col1 = 50;
      const col2 = 200;
      const col3 = 310;
      const col4 = 400;
      const col5 = 480;

      doc.fontSize(18).font('Helvetica-Bold').text('ERP CRM Portal', col1, 50);
      doc.fontSize(10).font('Helvetica').text('Sales Challan Invoice', col1, 75);
      doc.moveTo(col1, 95).lineTo(pageWidth + 50, 95).stroke('#ccc');

      let y = 115;
      doc.fontSize(11).font('Helvetica-Bold').text(`Challan #: `, col1, y);
      doc.font('Helvetica').text(challan.challanNumber, col1 + 80, y);
      y += 18;
      doc.font('Helvetica-Bold').text('Status: ', col1, y);
      doc.font('Helvetica').text(challan.status, col1 + 50, y);
      y += 18;
      doc.font('Helvetica-Bold').text('Date: ', col1, y);
      doc.font('Helvetica').text(new Date(challan.createdAt).toLocaleDateString(), col1 + 40, y);

      y += 30;
      doc.font('Helvetica-Bold').text('Customer Details', col1, y);
      y += 18;
      doc.font('Helvetica').text(`Name: ${challan.customer.name}`, col1, y);
      y += 15;
      if (challan.customer.businessName) {
        doc.text(`Business: ${challan.customer.businessName}`, col1, y);
        y += 15;
      }
      doc.text(`Mobile: ${challan.customer.mobile}`, col1, y);
      y += 15;
      doc.text(`Created by: ${challan.createdByUser?.name || 'User'}`, col1, y);

      y += 25;
      doc.moveTo(col1, y).lineTo(pageWidth + 50, y).stroke('#ccc');
      y += 10;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Product', col1, y);
      doc.text('SKU', col2, y);
      doc.text('Qty', col3, y);
      doc.text('Price', col4, y);
      doc.text('Total', col5, y);
      y += 5;
      doc.moveTo(col1, y).lineTo(pageWidth + 50, y).stroke('#ccc');
      y += 10;

      doc.font('Helvetica').fontSize(10);
      for (const item of challan.items) {
        const lineTotal = Number(item.unitPriceSnapshot) * item.quantity;
        doc.text(item.productNameSnapshot || 'N/A', col1, y, { width: col2 - col1 - 10 });
        doc.text(item.product?.sku || '-', col2, y);
        doc.text(String(item.quantity), col3, y);
        doc.text(`₹${Number(item.unitPriceSnapshot).toFixed(2)}`, col4, y);
        doc.text(`₹${lineTotal.toFixed(2)}`, col5, y);
        y += 18;
      }

      y += 10;
      doc.moveTo(col1, y).lineTo(pageWidth + 50, y).stroke('#ccc');
      y += 10;
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text(`Total Quantity: ${challan.totalQuantity}`, col1, y);
      y += 20;
      doc.font('Helvetica').fontSize(8).fillColor('#999');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, col1, y);

      doc.end();
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
