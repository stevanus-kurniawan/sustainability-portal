import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';

/**
 * OrganizationsController - Placeholder for organization operations
 *
 * Note: Organizations are managed externally or in Strapi CMS.
 */
@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}
}
