import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminLoginDto } from './dto/admin-login.dto';

const ADMIN_ACCESS_TOKEN_COOKIE = 'admin_access_token';

@ApiTags('admin-auth')
@Controller('admin-auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: AdminLoginDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminAuthService.login(dto.email, dto.password);
    this.setAdminCookie(res, result.accessToken, result.expiresIn, req);
    return { admin: result.admin, expiresIn: result.expiresIn };
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    this.clearAdminCookie(res, req);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Get current admin identity' })
  @ApiResponse({ status: 200, description: 'Admin identity returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@Request() req: any) {
    const admin = req.user;
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    };
  }

  private setAdminCookie(res: Response, token: string, expiresInSeconds: number, req?: any): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecureRequest = req && (req.secure || req.headers?.['x-forwarded-proto'] === 'https');
    res.cookie(ADMIN_ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: isProduction && !!isSecureRequest,
      sameSite: 'lax',
      maxAge: expiresInSeconds * 1000,
      path: '/',
    });
  }

  private clearAdminCookie(res: Response, req?: any): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecureRequest = req && (req.secure || req.headers?.['x-forwarded-proto'] === 'https');
    res.clearCookie(ADMIN_ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      secure: isProduction && !!isSecureRequest,
      sameSite: 'lax',
      path: '/',
    });
  }
}
