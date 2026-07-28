import { Controller, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

@Controller('seed')
export class SeedController {
  @Post()
  async seed() {
    const passwordHash = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: { name: 'Admin User', email: 'admin@test.com', passwordHash, role: 'ADMIN' },
    });
    const sales = await prisma.user.upsert({
      where: { email: 'sales@test.com' },
      update: {},
      create: { name: 'Sales User', email: 'sales@test.com', passwordHash, role: 'SALES' },
    });
    const warehouse = await prisma.user.upsert({
      where: { email: 'warehouse@test.com' },
      update: {},
      create: { name: 'Warehouse User', email: 'warehouse@test.com', passwordHash, role: 'WAREHOUSE' },
    });
    const accounts = await prisma.user.upsert({
      where: { email: 'accounts@test.com' },
      update: {},
      create: { name: 'Accounts User', email: 'accounts@test.com', passwordHash, role: 'ACCOUNTS' },
    });

    const customer1 = await prisma.customer.upsert({
      where: { id: 1 },
      update: {},
      create: { name: 'Rajesh Supplies', mobile: '9876543210', email: 'rajesh@example.com', businessName: 'Rajesh Enterprises', gstNumber: '29ABCDE1234F1Z5', customerType: 'WHOLESALE', address: '123, Industrial Area, Mumbai', status: 'ACTIVE', followUpDate: new Date('2026-08-15') },
    });
    const customer2 = await prisma.customer.upsert({
      where: { id: 2 },
      update: {},
      create: { name: 'Priya Traders', mobile: '9876543211', email: 'priya@example.com', businessName: 'Priya Trading Co.', customerType: 'RETAIL', address: '456, Market Road, Delhi', status: 'ACTIVE' },
    });
    const customer3 = await prisma.customer.upsert({
      where: { id: 3 },
      update: {},
      create: { name: 'Amit Distributors', mobile: '9876543212', businessName: 'Amit & Co.', customerType: 'DISTRIBUTOR', address: '789, Warehouse Zone, Bengaluru', status: 'LEAD', followUpDate: new Date('2026-08-10') },
    });
    const customer4 = await prisma.customer.upsert({
      where: { id: 4 },
      update: {},
      create: { name: 'Sneha Retail', mobile: '9876543213', email: 'sneha@example.com', customerType: 'RETAIL', status: 'INACTIVE' },
    });

    const product1 = await prisma.product.upsert({
      where: { sku: 'PROD-001' },
      update: {},
      create: { name: 'Steel Rod 12mm', sku: 'PROD-001', category: 'Steel', unitPrice: 750.00, currentStock: 500, minStockAlert: 50, warehouseLocation: 'Aisle A, Rack 1' },
    });
    const product2 = await prisma.product.upsert({
      where: { sku: 'PROD-002' },
      update: {},
      create: { name: 'Cement Bag 50kg', sku: 'PROD-002', category: 'Cement', unitPrice: 380.00, currentStock: 200, minStockAlert: 30, warehouseLocation: 'Aisle B, Rack 3' },
    });
    const product3 = await prisma.product.upsert({
      where: { sku: 'PROD-003' },
      update: {},
      create: { name: 'PVC Pipe 4 inch', sku: 'PROD-003', category: 'Plumbing', unitPrice: 250.00, currentStock: 1000, minStockAlert: 100, warehouseLocation: 'Aisle C, Rack 2' },
    });
    const product4 = await prisma.product.upsert({
      where: { sku: 'PROD-004' },
      update: {},
      create: { name: 'Paint White 20L', sku: 'PROD-004', category: 'Paint', unitPrice: 1200.00, currentStock: 15, minStockAlert: 20, warehouseLocation: 'Aisle D, Rack 1' },
    });

    await prisma.stockMovement.createMany({
      data: [
        { productId: product1.id, quantityChanged: 500, movementType: 'IN', reason: 'Initial stock', createdBy: warehouse.id },
        { productId: product2.id, quantityChanged: 200, movementType: 'IN', reason: 'Initial stock', createdBy: warehouse.id },
        { productId: product3.id, quantityChanged: 1000, movementType: 'IN', reason: 'Initial stock', createdBy: warehouse.id },
        { productId: product4.id, quantityChanged: 15, movementType: 'IN', reason: 'Initial stock', createdBy: warehouse.id },
      ],
    });

    await prisma.$disconnect();

    return { message: 'Seed completed successfully' };
  }
}
