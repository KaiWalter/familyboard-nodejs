import assert from 'assert';
import { classifyAccessToken } from '../../src/services/graphClient.js';

// Simple tests of token classification logic

const jwtSample = 'aaa.bbb.ccc';
const opaqueSample = 'EwBoBMl6BAAUBKgm8k1UswUNwklmy2v7U...';

assert.deepStrictEqual(classifyAccessToken(jwtSample), { type: 'jwt' });
assert.deepStrictEqual(classifyAccessToken(opaqueSample), { type: 'opaque' });
assert.strictEqual(classifyAccessToken('').type, 'none');

console.log('graphOpaqueToken tests passed');
