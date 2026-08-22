import * as migration_20260820_030343_initial from './20260820_030343_initial';
import * as migration_20260820_210000_seed_editable_pages from './20260820_210000_seed_editable_pages';
import * as migration_20260821_232804_add_logo_size from './20260821_232804_add_logo_size';

export const migrations = [
  {
    up: migration_20260820_030343_initial.up,
    down: migration_20260820_030343_initial.down,
    name: '20260820_030343_initial',
  },
  {
    up: migration_20260820_210000_seed_editable_pages.up,
    down: migration_20260820_210000_seed_editable_pages.down,
    name: '20260820_210000_seed_editable_pages',
  },
  {
    up: migration_20260821_232804_add_logo_size.up,
    down: migration_20260821_232804_add_logo_size.down,
    name: '20260821_232804_add_logo_size'
  },
];
