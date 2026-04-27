import client from './client';

export const chatApi = {
    getThreads: () => client.get('/chat/'),
    getMessages: (threadId) => client.get(`/chat/${threadId}/messages/`),
    startThread: (supplierId) => client.post('/chat/start/', { supplier_id: supplierId }),
};
