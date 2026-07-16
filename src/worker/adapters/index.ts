import { SocialAdapter } from './types';
import { facebookAdapter } from './facebook.adapter';
import { linkedinAdapter } from './linkedin.adapter';
import { mockAdapter } from './mock.adapter';

// Registry: thêm nền tảng mới = thêm 1 dòng ở đây.
export const ADAPTERS: Record<string, SocialAdapter> = {
  facebook: facebookAdapter,
  linkedin: linkedinAdapter,
  mock: mockAdapter,
};

export function getAdapter(platform: string): SocialAdapter | undefined {
  return ADAPTERS[platform];
}
