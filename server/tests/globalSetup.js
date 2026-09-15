import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Starts an in-memory MongoDB for the whole run. Set TEST_MONGODB_URI to use an existing server
 * instead (each test file still gets its own throwaway database).
 */
export default async function globalSetup(project) {
  let memoryServer;
  let uri = process.env.TEST_MONGODB_URI;

  if (!uri) {
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }

  project.provide('mongoUri', uri);

  return async () => {
    await memoryServer?.stop();
  };
}
