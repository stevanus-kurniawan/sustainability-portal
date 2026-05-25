import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { OperationalUnitsService } from './operational-units.service';

@ApiTags('public/operational-units')
@Controller('public/operational-units')
@Public()
export class OperationalUnitsPublicController {
  constructor(private readonly service: OperationalUnitsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
