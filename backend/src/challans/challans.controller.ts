import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChallansService } from './challans.service';
import { CreateChallanDto } from './dto/create-challan.dto';
import { QueryChallanDto } from './dto/query-challan.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('challans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChallansController {
  constructor(private challansService: ChallansService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SALES)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateChallanDto, @CurrentUser() user: any) {
    return this.challansService.create(dto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS)
  findAll(@Query() query: QueryChallanDto) {
    return this.challansService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.challansService.findOne(id);
  }

  @Patch(':id/confirm')
  @Roles(Role.ADMIN, Role.SALES)
  confirm(@Param('id', ParseIntPipe) id: number) {
    return this.challansService.confirm(id);
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.SALES)
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.challansService.cancel(id);
  }

  @Get(':id/pdf')
  @Roles(Role.ADMIN, Role.SALES)
  @HttpCode(HttpStatus.OK)
  async downloadPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const pdfBuffer = await this.challansService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="challan-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }
}
