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

const USER_ACCESS_TOKEN_COOKIE = 'user_access_token';
const COOKIE_MAX_AGE_SECONDS = 15 * 60; // 15 minutes

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration (email must be @energi-up.com)' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid email domain' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(
      dto.fullName,
      dto.email,
      dto.password,
    );
    this.setUserCookie(res, result.accessToken);
    return { user: result.user, expiresIn: result.expiresIn };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto.email, loginDto.password);
    this.setUserCookie(res, result.accessToken);
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
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshTokens(refreshDto.refreshToken);
    this.setUserCookie(res, result.accessToken);
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
    this.clearUserCookie(res);
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

  private setUserCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(USER_ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_SECONDS * 1000,
      path: '/',
    });
  }

  private clearUserCookie(res: Response): void {
    res.clearCookie(USER_ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      path: '/',
    });
  }
}
