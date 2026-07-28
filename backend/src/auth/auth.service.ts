import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: refreshHash },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refresh(refreshToken: string) {
    const users = await this.prisma.user.findMany({
      where: { refreshTokenHash: { not: null } },
    });

    let matchedUser: (typeof users)[0] | null = null;
    for (const user of users) {
      const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash!);
      if (valid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokens(matchedUser.id, matchedUser.email, matchedUser.role);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: { refreshTokenHash: refreshHash },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  private async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any,
    });

    const refreshToken = await this.generateRandomToken();

    return { accessToken, refreshToken };
  }

  private async generateRandomToken(): Promise<string> {
    const crypto = await import('node:crypto');
    return crypto.randomBytes(48).toString('hex');
  }
}
