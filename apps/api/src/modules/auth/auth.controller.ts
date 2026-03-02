import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import * as crypto from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const USER_ACCESS_TOKEN_COOKIE = 'user_access_token';
const CSRF_COOKIE_NAME = 'csrf_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User registration (production: @energi-up.com only; dev/local: any email)',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid email domain (production only)' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: RegisterDto,
  ) {
    const result = await this.authService.register(
      dto.fullName,
      dto.email,
      dto.password,
    );
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto.email, loginDto.password);
    this.setUserCookie(res, result.accessToken, result.expiresIn, req);
    return { user: result.user, expiresIn: result.expiresIn };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshTokens(refreshDto.refreshToken);
    this.setUserCookie(res, result.accessToken, result.expiresIn, req);
    return { user: result.user, expiresIn: result.expiresIn };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    await this.authService.logout(req.user.id, body?.refreshToken);
    this.clearUserCookie(res, req);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: any) {
    const user = req.user;
    const roles = user.userRoles?.map((ur: any) => ur.role.name) || [];
    const permissions = new Set<string>();

    for (const userRole of user.userRoles || []) {
      for (const rp of userRole.role?.rolePermissions || []) {
        permissions.add(rp.permission.code);
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      roles,
      permissions: Array.from(permissions),
      createdAt: user.createdAt,
    };
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address (15-minute link); on success sets session cookie for auto-login' })
  @ApiResponse({ status: 200, description: 'Email verified; session cookie set for auto-login' })
  @ApiResponse({ status: 400, description: 'Invalid or expired link' })
  async verifyEmail(
    @Query('token') token: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(token);
    if (result && 'accessToken' in result && result.accessToken) {
      this.setUserCookie(res, result.accessToken, result.expiresIn, req);
    }
    return result;
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({ status: 200, description: 'Generic success message' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('change-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change email before verification and resend link' })
  @ApiBody({ type: ChangeEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Generic success response (does not reveal account existence)',
  })
  async changeEmail(@Body() dto: ChangeEmailDto) {
    return this.authService.changeEmail(dto.currentEmail, dto.newEmail);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset (single-use link sent by email)' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Generic success (never reveals if email exists)',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token from forgot-password email' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  private getCookieOptions(req?: any): import('express').CookieOptions {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProd = nodeEnv === 'production';
    const forwardedProto = req?.headers?.['x-forwarded-proto'];
    const reqSecure = !!req?.secure;

    const appearsSecure = reqSecure || forwardedProto === 'https';
    const secure = isProd ? true : appearsSecure;

    const sameSite: boolean | 'lax' | 'strict' | 'none' =
      (process.env.COOKIE_SAMESITE as any) || 'lax';

    const domain = process.env.COOKIE_DOMAIN || undefined;

    return {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path: '/',
    };
  }

  private setUserCookie(
    res: Response,
    token: string,
    expiresInSeconds: number,
    req?: any,
  ): void {
    const baseOptions = this.getCookieOptions(req);
    const csrfToken = crypto.randomBytes(32).toString('hex');

    res.cookie(USER_ACCESS_TOKEN_COOKIE, token, {
      ...baseOptions,
      maxAge: expiresInSeconds * 1000,
    });

    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      ...baseOptions,
      httpOnly: false,
      maxAge: expiresInSeconds * 1000,
    });
  }

  private clearUserCookie(res: Response, req?: any): void {
    const baseOptions = this.getCookieOptions(req);

    res.clearCookie(USER_ACCESS_TOKEN_COOKIE, baseOptions);
    res.clearCookie(CSRF_COOKIE_NAME, {
      ...baseOptions,
      httpOnly: false,
    });
  }
}
