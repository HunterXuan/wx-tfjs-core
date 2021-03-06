/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as tf from '../index';
import {ALL_ENVS, describeWithFlags} from '../jasmine_util';
import {expectArraysClose} from '../test_util';

describeWithFlags('fused matmul', ALL_ENVS, () => {
  it('A x B', async () => {
    const a = tf.tensor2d([1, 2, 3, 4, 5, 6], [2, 3]);
    const b = tf.tensor2d([0, 1, -3, 2, 2, 1], [3, 2]);

    const c = tf.fused.matMul(a, b);

    expect(c.shape).toEqual([2, 2]);
    expectArraysClose(await c.data(), [0, 8, -3, 20]);
  });

  it('A x B with relu', async () => {
    const a = tf.tensor2d([1, 2, 3, 4, 5, 6], [2, 3]);
    const b = tf.tensor2d([0, 1, -3, 2, 2, 1], [3, 2]);
    const transposeA = false;
    const transposeB = false;

    const c = tf.fused.matMul(a, b, transposeA, transposeB, null, 'relu');

    expect(c.shape).toEqual([2, 2]);
    expectArraysClose(await c.data(), [0, 8, 0, 20]);
  });

  it('A x B with relu transpose', async () => {
    const a = tf.tensor2d([1, 2, 3, 4, 5, 6], [2, 3]);
    const b = tf.tensor2d([0, 1, -3, 2, 2, 1], [2, 3]);
    const transposeA = false;
    const transposeB = true;

    const c = tf.fused.matMul(a, b, transposeA, transposeB, null, 'relu');

    expect(c.shape).toEqual([2, 2]);
    expectArraysClose(await c.data(), [0, 9, 0, 24]);
  });

  it('A x B with relu and bias', async () => {
    const a = tf.tensor2d([1, 2, 3, 4, 5, 6], [2, 3]);
    const b = tf.tensor2d([0, 1, -3, 2, 2, 1], [3, 2]);
    const c = tf.tensor2d([1, 1, 1, 1], [2, 2]);
    const transposeA = false;
    const transposeB = false;

    const d = tf.fused.matMul(a, b, transposeA, transposeB, c, 'relu');

    expect(d.shape).toEqual([2, 2]);
    expectArraysClose(await d.data(), [1, 9, 0, 21]);
  });

  it('A x B with relu and broadcasted bias', async () => {
    const a = tf.tensor2d([1, 2, 3, 4, 5, 6], [2, 3]);
    const b = tf.tensor2d([0, 1, -3, 2, 2, 1], [3, 2]);
    const c = tf.tensor1d([1, 1]);
    const act: tf.fused.Activation = 'relu';
    const transposeA = false;
    const transposeB = false;

    const d = tf.fused.matMul(a, b, transposeA, transposeB, c, act);

    expect(d.shape).toEqual([2, 2]);
    expectArraysClose(await d.data(), [1, 9, 0, 21]);
  });

  it('A x B with relu and broadcasted bias different rank', async () => {
    const a = tf.tensor3d([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [2, 2, 3]);
    const b = tf.tensor3d([0, 1, -3, 2, 2, 1, 0, 1, -3, 2, 2, 1], [2, 3, 2]);
    const c = tf.tensor2d([1, 2], [1, 2]);
    const act: tf.fused.Activation = 'relu';
    const transposeA = false;
    const transposeB = false;

    const d = tf.fused.matMul(a, b, transposeA, transposeB, c, act);

    expect(d.shape).toEqual([2, 2, 2]);
    expectArraysClose(await d.data(), [2, 6, 0, 18, 0, 30, 0, 42]);
  });

  it('A x B with bias only', async () => {
    const a = tf.tensor2d([1, 2, 3, 4, 5, 6], [2, 3]);
    const b = tf.tensor2d([0, 1, -3, 2, 2, 1], [3, 2]);
    const c = tf.tensor2d([1, 1, 1, 1], [2, 2]);
    const transposeA = false;
    const transposeB = false;

    const d = tf.fused.matMul(a, b, transposeA, transposeB, c, 'linear');

    expect(d.shape).toEqual([2, 2]);
    expectArraysClose(await d.data(), [1, 9, -2, 21]);
  });

  it('A x B with relu gradient', async () => {
    const a = tf.tensor2d([1, 2, 3, 10, 20, -30], [2, 3]);
    const b = tf.tensor2d([2, 3, 4, -1, 2, 3], [3, 2]);
    const dy = tf.tensor2d([1, 10, 20, 30], [2, 2]);
    const transposeA = false;
    const transposeB = false;

    const grads = tf.grads((a, b) => {
      const prod = tf.matMul(a, b, transposeA, transposeB);
      return tf.relu(prod);
    });

    const fusedGrads = tf.grads((a, b) => {
      return tf.fused.matMul(a, b, transposeA, transposeB, null, 'relu');
    });

    const [da, db] = grads([a, b], dy);
    const [fusedDa, fusedDb] = fusedGrads([a, b], dy);
    expectArraysClose(await da.array(), await fusedDa.array());
    expectArraysClose(await db.data(), await fusedDb.array());
  });

  it('gradient with clones A x B with relu', () => {
    const a = tf.tensor2d([1, 2, 3, 10, 20, -30], [2, 3]);
    const b = tf.tensor2d([2, 3, 4, -1, 2, 3], [3, 2]);
    const dy = tf.tensor2d([1, 10, 20, 30], [2, 2]);
    const transposeA = false;
    const transposeB = false;

    const fusedGrads = tf.grads((a, b) => {
      return tf.fused
          .matMul(a.clone(), b.clone(), transposeA, transposeB, null, 'relu')
          .clone();
    });

    const [fusedDa, fusedDb] = fusedGrads([a, b], dy);
    expect(fusedDa.shape).toEqual(a.shape);
    expect(fusedDb.shape).toEqual(b.shape);
  });

  it('A x B with relu bias gradient', async () => {
    const a = tf.tensor2d([1, 2, 3, 10, 20, -30], [2, 3]);
    const b = tf.tensor2d([2, 3, 4, -1, 2, 3], [3, 2]);
    const c = tf.tensor2d([1, 1, 1, 1], [2, 2]);
    const transposeA = false;
    const transposeB = false;

    const dy = tf.tensor2d([1, 10, 20, 30], [2, 2]);

    const grads = tf.grads((a, b, c) => {
      const prod = tf.matMul(a, b, transposeA, transposeB);
      const sum = tf.add(prod, c);
      return tf.relu(sum);
    });

    const fusedGrads = tf.grads((a, b, c) => {
      return tf.fused.matMul(a, b, transposeA, transposeB, c, 'relu');
    });

    const [da, db, dc] = grads([a, b, c], dy);
    const [fusedDa, fusedDb, fusedDc] = fusedGrads([a, b, c], dy);

    expectArraysClose(await da.array(), await fusedDa.array());
    expectArraysClose(await db.array(), await fusedDb.array());
    expectArraysClose(await dc.array(), await fusedDc.array());
  });

  it('A x B with relu bias gradient transpose', async () => {
    const a = tf.tensor2d([1, 2, 3, 10, 20, -30], [3, 2]);
    const b = tf.tensor2d([2, 3, 4, -1, 2, 3], [3, 2]);
    const c = tf.tensor2d([1, 1, 1, 1], [2, 2]);
    const transposeA = true;
    const transposeB = false;

    const dy = tf.tensor2d([1, 10, 20, 30], [2, 2]);

    const grads = tf.grads((a, b, c) => {
      const prod = tf.matMul(a, b, transposeA, transposeB);
      const sum = tf.add(prod, c);
      return tf.relu(sum);
    });

    const fusedGrads = tf.grads((a, b, c) => {
      return tf.fused.matMul(a, b, transposeA, transposeB, c, 'relu');
    });

    const [da, db, dc] = grads([a, b, c], dy);
    const [fusedDa, fusedDb, fusedDc] = fusedGrads([a, b, c], dy);

    expectArraysClose(await da.array(), await fusedDa.array());
    expectArraysClose(await db.array(), await fusedDb.array());
    expectArraysClose(await dc.array(), await fusedDc.array());
  });

  it('A x B with relu and broadcasted bias gradient', async () => {
    const a = tf.tensor2d([1, 2, 3, 10, 20, -30], [2, 3]);
    const b = tf.tensor2d([2, 3, 4, -1, 2, 3], [3, 2]);
    const c = tf.tensor2d([[1]]);
    const transposeA = false;
    const transposeB = false;

    const dy = tf.tensor2d([1, 10, 20, 30], [2, 2]);

    const grads = tf.grads((a, b, c) => {
      const prod = tf.matMul(a, b, transposeA, transposeB);
      const sum = tf.add(prod, c);
      return tf.relu(sum);
    });

    const fusedGrads = tf.grads((a, b, c) => {
      return tf.fused.matMul(a, b, transposeA, transposeB, c, 'relu');
    });

    const [da, db, dc] = grads([a, b, c], dy);
    const [fusedDa, fusedDb, fusedDc] = fusedGrads([a, b, c], dy);

    expectArraysClose(await da.array(), await fusedDa.array());
    expectArraysClose(await db.array(), await fusedDb.array());
    expectArraysClose(await dc.array(), await fusedDc.array());
  });
});
