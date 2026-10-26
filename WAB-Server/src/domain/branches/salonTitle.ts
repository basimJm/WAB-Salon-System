import { BRANCH_TITLE_SEPARATOR } from '../../constants/branches';

/**
 * How a salon place is named to customers and members (§5.17): "Salon - Branch" when the salon
 * has more than one branch, whichever branch it is (the main one included); the salon name alone
 * for a single-branch salon or when the branch is unknown (rows older than branches).
 */
export const salonTitle = (
  salonName: string,
  branchName: string | undefined,
  branchCount: number,
): string =>
  branchCount > 1 && branchName !== undefined && branchName !== ''
    ? `${salonName}${BRANCH_TITLE_SEPARATOR}${branchName}`
    : salonName;
