import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto, AcceptInvitationDto } from './dto/invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Invitaciones y Registro Seguro')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar invitación segura para un nuevo usuario o empleado' })
  @ApiResponse({ status: 201, description: 'Invitación creada y token generado' })
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.create(dto, user.id, dto.businessId);
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verificar la validez y vigencia de un token de invitación' })
  @ApiResponse({ status: 200, description: 'Token verificado' })
  async verify(@Query('token') token: string) {
    return this.invitationsService.verify(token);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceptar invitación y activar/vincular cuenta' })
  @ApiResponse({ status: 200, description: 'Invitación aceptada y sesión iniciada' })
  async accept(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.invitationsService.accept(dto, ip, userAgent);
  }

  @Get('businesses/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar invitaciones enviadas para un negocio' })
  async findByBusiness(@Query('businessId') queryBizId: string, @Req() req: any) {
    const businessId = req.params?.businessId || queryBizId;
    return this.invitationsService.findByBusiness(businessId);
  }

  @Post('businesses/:businessId/:invitationId/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revocar una invitación pendiente' })
  async revoke(
    @Req() req: any,
  ) {
    const { businessId, invitationId } = req.params;
    return this.invitationsService.revoke(businessId, invitationId);
  }
}

