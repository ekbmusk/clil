import { apiClient } from './client';

export async function stats() {
  const { data } = await apiClient.get('/teacher/stats');
  return data;
}

export async function students() {
  const { data } = await apiClient.get('/teacher/students');
  return data;
}

export async function attempts(filters = {}) {
  const { data } = await apiClient.get('/teacher/attempts', { params: filters });
  return data;
}

export async function broadcast(payload) {
  const { data } = await apiClient.post('/teacher/broadcast', payload);
  return data;
}

export async function createLesson(payload) {
  const { data } = await apiClient.post('/teacher/lessons', payload);
  return data;
}

export async function patchLesson(externalId, payload) {
  const { data } = await apiClient.patch(`/teacher/lessons/${externalId}`, payload);
  return data;
}

export async function createTask(payload) {
  const { data } = await apiClient.post('/teacher/tasks', payload);
  return data;
}

export async function patchTask(id, payload) {
  const { data } = await apiClient.patch(`/teacher/tasks/${id}`, payload);
  return data;
}
