import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';
import { put } from '@vercel/blob';
import { CurrentUser } from '../../common/auth';

class UploadDto {
  @IsString()
  @MinLength(1)
  filename: string;

  // Chỉ nhận ảnh — chặn upload file lạ.
  @Matches(/^image\/(jpeg|png|webp|gif)$/, { message: 'Chỉ chấp nhận ảnh' })
  contentType: string;

  @IsString()
  @MinLength(1)
  dataBase64: string;
}

// Giới hạn 4MB sau giải mã. Ảnh đã được thu nhỏ ở client nên thường < 1MB;
// đây là hàng rào phòng khi client không thu nhỏ. Vercel serverless cũng chặn
// payload ~4.5MB, nên đây là mức an toàn dưới ngưỡng đó.
const MAX_BYTES = 4 * 1024 * 1024;

@Controller('upload')
export class UploadsController {
  @Post()
  async upload(@CurrentUser() userId: string, @Body() dto: UploadDto) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new BadRequestException(
        'Server chưa bật kho ảnh (Vercel Blob). Thêm Blob storage vào project rồi Redeploy.',
      );
    }

    const buffer = Buffer.from(dto.dataBase64, 'base64');
    if (buffer.length === 0) throw new BadRequestException('Dữ liệu ảnh rỗng');
    if (buffer.length > MAX_BYTES) {
      throw new BadRequestException('Ảnh quá lớn (tối đa 4MB sau khi nén)');
    }

    // Tên file: gắn userId + thời gian để không đè lên nhau. Blob tự thêm hậu
    // tố ngẫu nhiên nên kể cả trùng tên cũng không sao.
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
    const blob = await put(`posts/${userId}/${Date.now()}-${safeName}`, buffer, {
      access: 'public', // Facebook cần tải được ảnh qua URL công khai
      contentType: dto.contentType,
    });

    return { url: blob.url };
  }
}
