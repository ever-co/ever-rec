import { IsId } from '../../validators/id.validator';

export class AddTeamMemberDto {
  @IsId()
  teamId: string;

  @IsId()
  memberId: string;
}
