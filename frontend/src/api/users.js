import { apiClient } from './client';

function getInitDataUnsafe() {
  return window.Telegram?.WebApp?.initDataUnsafe || null;
}

export async function register() {
  const unsafe = getInitDataUnsafe();
  const body = unsafe?.user
    ? {
        user: {
          id: unsafe.user.id,
          first_name: unsafe.user.first_name,
          last_name: unsafe.user.last_name,
          username: unsafe.user.username,
          language_code: unsafe.user.language_code,
          photo_url: unsafe.user.photo_url,
        },
      }
    : {};
  const { data } = await apiClient.post('/users/register', body);
  return data;
}

export async function me() {
  const { data } = await apiClient.get('/users/me');
  return data;
}
