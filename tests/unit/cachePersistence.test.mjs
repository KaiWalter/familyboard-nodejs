import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import * as calendarService from '../../src/services/calendarService.js';
import * as photoService from '../../src/services/photoService.js';

function makeTempFile(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-persist-'));
  return { file: path.join(dir, name), dir };
}

test.skip('calendar service persists events to disk and recovers on fetch error', async () => {
  const { file: eventsPath, dir } = makeTempFile('events.json');
  calendarService.__setEventsCachePath(eventsPath);
  calendarService.__resetEventsCacheForTests();
  calendarService.__setFetchCalendarView(async () => ([{
    id: 'evt-1',
    subject: 'Test Event',
    start: { dateTime: '2025-10-19T10:00:00' },
    end: { dateTime: '2025-10-19T11:00:00' },
    isAllDay: false
  }]));

  const events = await calendarService.fetchEvents();
  assert.ok(events.length > 0);
  const expectedCount = events.length;
  assert.equal(fs.existsSync(eventsPath), true, 'events cache file written');
  const disk = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
  assert.equal(Array.isArray(disk.events), true);
  assert.equal(disk.events.length, expectedCount);

  // Simulate restart + network failure
  calendarService.__resetEventsCacheForTests();
  calendarService.__setFetchCalendarView(async () => { throw new Error('offline'); });
  const fallback = await calendarService.fetchEvents();
  assert.equal(fallback.length, expectedCount, 'fallback events served from disk');
  assert.equal(fallback[0].id, 'evt-1');

  calendarService.__setFetchCalendarView(null);
  calendarService.__setEventsCachePath(null);
  calendarService.__resetEventsCacheForTests();
  fs.rmSync(dir, { recursive: true, force: true });
});

test.skip('photo service persists items to disk and serves fallback when fetch fails', async () => {
  const { file: photosPath, dir } = makeTempFile('photos.json');
  photoService.__setPhotosCachePath(photosPath);
  photoService.__resetPhotosCacheForTests();
  photoService.__setFetchPhotoItems(async () => ([
    { id: 'img-1', title: 'One', url: 'http://example/one.jpg', width: 800, height: 600, orientation: 'landscape' },
    { id: 'img-2', title: 'Two', url: 'http://example/two.jpg', width: 600, height: 900, orientation: 'portrait' }
  ]));

  const photos = await photoService.fetchPhotos();
  assert.equal(photos.length, 2);
  assert.equal(fs.existsSync(photosPath), true, 'photos cache file written');
  const disk = JSON.parse(fs.readFileSync(photosPath, 'utf-8'));
  assert.equal(Array.isArray(disk.photos), true);
  assert.equal(disk.photos.length, 2);

  photoService.__resetPhotosCacheForTests();
  photoService.__setFetchPhotoItems(async () => { throw new Error('offline'); });
  const fallback = await photoService.fetchPhotos();
  assert.equal(fallback.length, 2, 'fallback photos served from disk');
  assert.equal(fallback[0].id, 'img-1');

  photoService.__setFetchPhotoItems(null);
  photoService.__setPhotosCachePath(null);
  photoService.__resetPhotosCacheForTests();
  fs.rmSync(dir, { recursive: true, force: true });
});
