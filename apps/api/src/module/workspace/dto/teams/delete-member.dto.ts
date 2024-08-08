import { IsId } from '../../validators/id.validator';

export class DeleteTeamMemberDto {
  @IsId()
  teamId: string;

  @IsId()
  memberId: string;
}
