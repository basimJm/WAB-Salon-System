import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MOCK_BRANCHES, MOCK_BRANCH_IDS } from '@/data/mock/branchesFixture';
import { MOCK_SALONS } from '@/data/mock/salonsRoutes';
import { mockMessage } from '@/data/mock/messages';
import { AppError } from '@/infrastructure/errors/AppError';
import { InlineAlert } from '@/presentation/components/feedback/InlineAlert';
import { makeContainer, renderWithApp } from './helpers/render';

const NOOR = MOCK_SALONS[0]!.id;
const DABOUQ = MOCK_BRANCHES[NOOR]!.find((b) => b.status === 'OFFLINE')!.id;

const refusal = async (p: Promise<unknown>): Promise<AppError> => {
  const error: unknown = await p.then(
    () => null,
    (e: unknown) => e,
  );
  if (!(error instanceof AppError)) throw new Error('expected an AppError');
  return error;
};

describe('branch status refusals carry their own message (SRV-151, contract 1.5.0)', () => {
  it('closing the main branch: INVALID_TRANSITION with the main-branch message', async () => {
    const { repositories } = makeContainer();
    const e = await refusal(
      repositories.branches.act(NOOR, MOCK_BRANCH_IDS.noorMain, 'close', 'x'),
    );
    expect(e.code).toBe('INVALID_TRANSITION');
    expect(e.serverMessage).toBe(mockMessage('en', 'branchMainCannotClose'));
  });

  it('making an offline branch the main one: INVALID_TRANSITION with the branch-status message', async () => {
    const { repositories } = makeContainer();
    const e = await refusal(repositories.branches.act(NOOR, DABOUQ, 'main', 'x'));
    expect(e.code).toBe('INVALID_TRANSITION');
    expect(e.serverMessage).toBe(mockMessage('en', 'branchInvalidStatus'));
  });

  it('the branches tab alert shows the server wording, not the generic transition text', async () => {
    const { repositories } = makeContainer();
    const e = await refusal(
      repositories.branches.act(NOOR, MOCK_BRANCH_IDS.noorMain, 'close', 'x'),
    );
    renderWithApp(<InlineAlert error={e} />, makeContainer(), 'ar');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      mockMessage('en', 'branchMainCannotClose'),
    );
    expect(mockMessage('ar', 'branchMainCannotClose')).not.toBe(
      mockMessage('en', 'branchMainCannotClose'),
    );
  });
});
