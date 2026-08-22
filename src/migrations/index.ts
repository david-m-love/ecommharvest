import * as migration_20260820_030343_initial from './20260820_030343_initial';
import * as migration_20260820_210000_seed_editable_pages from './20260820_210000_seed_editable_pages';
import * as migration_20260821_232804_add_logo_size from './20260821_232804_add_logo_size';
import * as migration_20260822_020000_legal_pages_editable from './20260822_020000_legal_pages_editable';
import * as migration_20260822_050000_real_legal_details from './20260822_050000_real_legal_details';
import * as migration_20260822_052353_seo_headline from './20260822_052353_seo_headline';

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
    name: '20260821_232804_add_logo_size',
  },
  {
    up: migration_20260822_020000_legal_pages_editable.up,
    down: migration_20260822_020000_legal_pages_editable.down,
    name: '20260822_020000_legal_pages_editable',
  },
  {
    up: migration_20260822_050000_real_legal_details.up,
    down: migration_20260822_050000_real_legal_details.down,
    name: '20260822_050000_real_legal_details',
  },
  {
    up: migration_20260822_052353_seo_headline.up,
    down: migration_20260822_052353_seo_headline.down,
    name: '20260822_052353_seo_headline'
  },
];
