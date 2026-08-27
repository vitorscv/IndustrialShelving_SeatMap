import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { parseProductNames } from './parse-spreadsheet';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — enough for a large product catalog, small enough to avoid abuse.

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        const name = file.originalname.toLowerCase();
        const ok = name.endsWith('.xlsx') || name.endsWith('.csv');
        callback(ok ? null : new BadRequestException('Only .xlsx or .csv files are supported'), ok);
      },
    }),
  )
  async import(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const names = await parseProductNames(file);
    return this.productsService.importNames(names);
  }
}
