import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from '@jest/globals';

import { resetTasksStore } from '@/mocks/handlers';
import { server } from '@/mocks/server';

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
	server.resetHandlers();
	resetTasksStore();
});

afterAll(() => {
	server.close();
});
