import { Injectable } from '@nestjs/common';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

@Injectable()
export class ProductsImageService {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads/products';
  private readonly baseUrl = '/uploads/products';

  async upload(file: Express.Multer.File): Promise<string> {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }

    const ext = extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = join(this.uploadDir, filename);

    writeFileSync(filePath, file.buffer);

    return `${this.baseUrl}/${filename}`;
  }
}
