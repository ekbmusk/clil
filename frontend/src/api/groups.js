import { apiClient } from './client';

export async function list() {
  const { data } = await apiClient.get('/groups/');
  return data;
}

export async function create(payload) {
  const { data } = await apiClient.post('/groups/', payload);
  return data;
}

export async function enroll(groupId, userId) {
  const { data } = await apiClient.post(`/groups/${groupId}/enroll`, { user_id: userId });
  return data;
}

export async function progress(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}/progress`);
  return data;
}
