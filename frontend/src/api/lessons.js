import { apiClient } from './client';

export async function list() {
  const { data } = await apiClient.get('/lessons/');
  return data;
}

export async function get(externalId) {
  const { data } = await apiClient.get(`/lessons/${externalId}`);
  return data;
}
