import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { mobile: dto.mobile },
    });
    if (existing) {
      throw new ConflictException('A customer with this mobile number already exists');
    }

    return this.prisma.customer.create({
      data: {
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email,
        businessName: dto.businessName,
        gstNumber: dto.gstNumber,
        customerType: dto.customerType,
        address: dto.address,
        status: dto.status,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });
  }

  async findAll(query: QueryCustomerDto) {
    const { page = 1, limit = 10, search, status, customerType } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (customerType) where.customerType = customerType;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        followUpNotes: {
          include: { createdByUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.followUpDate !== undefined) {
      data.followUpDate = new Date(dto.followUpDate);
    }
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async addFollowUp(customerId: number, dto: CreateFollowUpDto, userId: number) {
    await this.findOne(customerId);
    return this.prisma.followUpNote.create({
      data: {
        note: dto.note,
        customerId,
        createdBy: userId,
      },
      include: {
        createdByUser: { select: { id: true, name: true } },
      },
    });
  }
}
