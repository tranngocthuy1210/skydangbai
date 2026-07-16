import { query } from '../shared/db';
import { decryptToken, encryptToken } from '../shared/crypto';

// Refresh access token khi sắp/đã hết hạn.
// Ở đây là stub: mock trả về token hiện tại; các nền tảng thật cần gọi OAuth refresh endpoint.
export async function refreshAccessToken(
  accountId: string,
  platform: string,
): Promise<string> {
  const [acc] = await query(
    `SELECT access_token_enc, refresh_token_enc FROM social_accounts WHERE id = $1`,
    [accountId],
  );
  if (!acc) throw new Error('account not found');

  if (platform === 'mock') {
    return decryptToken(acc.access_token_enc);
  }

  // TODO: gọi endpoint refresh thật của từng nền tảng bằng refresh_token_enc,
  // rồi cập nhật access_token_enc + token_expires_at.
  // Ví dụ minh họa cấu trúc cập nhật sau khi có token mới:
  //
  //   const newToken = await callOAuthRefresh(platform, decryptToken(acc.refresh_token_enc));
  //   await query(
  //     `UPDATE social_accounts SET access_token_enc=$2, token_expires_at=$3, updated_at=now() WHERE id=$1`,
  //     [accountId, encryptToken(newToken.accessToken), newToken.expiresAt],
  //   );
  //   return newToken.accessToken;

  void encryptToken; // giữ import cho ví dụ trên
  throw new Error(`refresh chưa được triển khai cho nền tảng: ${platform}`);
}
