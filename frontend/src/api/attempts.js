import { apiClient } from './client';

export async function submit(taskExternalId, answer) {
  const { data } = await apiClient.post('/attempts/', {
    task_external_id: taskExternalId,
    answer,
  });
  return data;
}

export async function finalizeLesson(externalId) {
  const { data } = await apiClient.post(`/attempts/finalize-lesson/${externalId}`);
  return data;
}
