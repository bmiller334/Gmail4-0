import { EMAIL_CATEGORIES } from './categories';

describe('Categories Constants', () => {
  it('should explicitly include standard categories', () => {
    // Verify essential categories are present to avoid regressions
    expect(EMAIL_CATEGORIES).toContain('Finance');
    expect(EMAIL_CATEGORIES).toContain('Work');
    expect(EMAIL_CATEGORIES).toContain('Manual Sort');
    expect(EMAIL_CATEGORIES).toContain('Security Alerts');
  });

  it('should not contain duplicates', () => {
    const uniqueCategories = new Set(EMAIL_CATEGORIES);
    expect(uniqueCategories.size).toBe(EMAIL_CATEGORIES.length);
  });
});
