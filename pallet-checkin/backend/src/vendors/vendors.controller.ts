import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VendorsService } from './vendors.service';
import { parseFirstColumnValues } from '../common/parse-spreadsheet';
import { CreateVendorDto } from './dto/create-vendor.dto';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — enough for a large vendor catalog, small enough to avoid abuse.

@UseGuards(JwtAuthGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ADMIN and OPERATOR only — needed by the check-in Vendedor dropdown.
  // The VENDEDOR role (a strictly read-only viewer of Visão Geral/Resumo
  // atual) never checks anything in, so it has no use for this catalog
  // and shouldn't be able to reach it either.
  @Roles('ADMIN', 'OPERATOR')
  @UseGuards(RolesGuard)
  @Get()
  findAll() {
    return this.vendorsService.findAll();
  }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.vendorsService.create(dto.name);
  }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
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
    const names = await parseFirstColumnValues(file);
    return this.vendorsService.importNames(names);
  }
}
