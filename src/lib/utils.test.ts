import { cn } from './utils';

describe('Utility - cn', () => {
  it('should merge tailwind classes properly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('should handle conditional classes using clsx', () => {
    expect(cn('bg-red-500', { 'text-white': true, 'font-bold': false })).toBe('bg-red-500 text-white');
  });

  it('should override classes properly with tailwind-merge', () => {
    // text-black should override text-white
    expect(cn('text-white', 'text-black')).toBe('text-black');
    // py-2 should override py-1
    expect(cn('py-1 px-2', 'py-2')).toBe('px-2 py-2');
  });
});
