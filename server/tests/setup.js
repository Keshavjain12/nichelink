import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';
import * as models from '../src/models/index.js';

beforeAll(async () => {
  const dbName = `nichelink_test_${crypto.randomBytes(6).toString('hex')}`;
  await mongoose.connect(inject('mongoUri'), { dbName });
  // Text and unique indexes must exist before queries rely on them.
  await Promise.all(
    Object.values(models)
      .filter((model) => typeof model?.syncIndexes === 'function')
      .map((model) => model.syncIndexes()),
  );
});

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
