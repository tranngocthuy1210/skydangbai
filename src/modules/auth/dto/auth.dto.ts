import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  // 8 ký tự là mức tối thiểu tử tế. Không ép ký tự đặc biệt: quy tắc rườm rà
  // khiến người ta chọn "Password1!" — đoán được, mà lại khó nhớ.
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải từ 8 ký tự trở lên' })
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  password: string;
}
