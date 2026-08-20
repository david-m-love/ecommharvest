import * as migration_20260820_030343_initial from './20260820_030343_initial';

export const migrations = [
  {
    up: migration_20260820_030343_initial.up,
    down: migration_20260820_030343_initial.down,
    name: '20260820_030343_initial'
  },
];
