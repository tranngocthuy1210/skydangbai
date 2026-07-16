export type TargetType = 'page' | 'group' | 'profile' | 'channel';

export interface PublishInput {
  targetPlatformId: string;
  targetType: TargetType;
  accessToken: string;
  content: string;
  mediaUrls?: string[];
}

export interface PublishResult {
  platformPostId: string;
  permalink?: string;
  raw: unknown;
}

export type PublishErrorCode =
  | 'RATE_LIMITED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CONTENT'
  | 'PERMISSION_DENIED'
  | 'UNSUPPORTED_TARGET' // nền tảng không có API chính thức cho loại target này
  | 'NETWORK'
  | 'UNKNOWN';

// Lỗi chuẩn hóa để worker quyết định có retry hay không.
export class PublishError extends Error {
  constructor(
    public code: PublishErrorCode,
    public retryable: boolean,
    public httpStatus?: number,
    public raw?: unknown,
  ) {
    super(code);
    this.name = 'PublishError';
  }
}

export interface SocialAdapter {
  publish(input: PublishInput): Promise<PublishResult>;
}
