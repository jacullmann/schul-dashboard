import { describe, expect, it } from 'vitest';
import { emptySecondFactor, secondFactorProof } from './secondFactor';

describe('secondFactorProof', () => {
  it('accepts a complete authenticator code', () => {
    expect(secondFactorProof({ mode: 'code', value: ' 123456 ' })).toEqual({
      code: '123456',
    });
  });

  it('waits for all six digits', () => {
    expect(secondFactorProof({ mode: 'code', value: '12345' })).toBeNull();
    expect(secondFactorProof({ mode: 'code', value: '12345a' })).toBeNull();
  });

  it('accepts recovery codes however they are grouped or cased', () => {
    for (const value of ['ABCDE-FGHJK', 'abcde fghjk', 'ABCDEFGHJK']) {
      expect(secondFactorProof({ mode: 'recoveryCode', value })).toEqual({
        recoveryCode: value,
      });
    }
  });

  it('rejects incomplete recovery codes', () => {
    expect(
      secondFactorProof({ mode: 'recoveryCode', value: 'ABCDE-FGH' }),
    ).toBeNull();
  });

  it('starts empty', () => {
    expect(secondFactorProof(emptySecondFactor('recoveryCode'))).toBeNull();
  });
});
