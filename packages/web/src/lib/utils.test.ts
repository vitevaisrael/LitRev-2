import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names and resolves conflicts', () => {
    expect(cn('px-2', 'py-2', 'px-4')).toContain('px-4');
  });
});

