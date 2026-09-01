import * as migration_20260820_030343_initial from './20260820_030343_initial';
import * as migration_20260820_210000_seed_editable_pages from './20260820_210000_seed_editable_pages';
import * as migration_20260821_232804_add_logo_size from './20260821_232804_add_logo_size';
import * as migration_20260822_020000_legal_pages_editable from './20260822_020000_legal_pages_editable';
import * as migration_20260822_050000_real_legal_details from './20260822_050000_real_legal_details';
import * as migration_20260822_052353_seo_headline from './20260822_052353_seo_headline';
import * as migration_20260822_060931_nav_links from './20260822_060931_nav_links';
import * as migration_20260822_063000_cookie_section from './20260822_063000_cookie_section';
import * as migration_20260822_180146_meta_pixel_id from './20260822_180146_meta_pixel_id';
import * as migration_20260829_233857_add_blog from './20260829_233857_add_blog';
import * as migration_20260829_234831_blog_heading from './20260829_234831_blog_heading'
import * as migration_20260830_010000_masterclass_date from './20260830_010000_masterclass_date'
import * as migration_20260901_120000_funnel_on_our_site from './20260901_120000_funnel_on_our_site';

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
    name: '20260822_052353_seo_headline',
  },
  {
    up: migration_20260822_060931_nav_links.up,
    down: migration_20260822_060931_nav_links.down,
    name: '20260822_060931_nav_links',
  },
  {
    up: migration_20260822_063000_cookie_section.up,
    down: migration_20260822_063000_cookie_section.down,
    name: '20260822_063000_cookie_section',
  },
  {
    up: migration_20260822_180146_meta_pixel_id.up,
    down: migration_20260822_180146_meta_pixel_id.down,
    name: '20260822_180146_meta_pixel_id',
  },
  {
    up: migration_20260829_233857_add_blog.up,
    down: migration_20260829_233857_add_blog.down,
    name: '20260829_233857_add_blog',
  },
  {
    up: migration_20260829_234831_blog_heading.up,
    down: migration_20260829_234831_blog_heading.down,
    name: '20260829_234831_blog_heading'
  },
  {
    up: migration_20260830_010000_masterclass_date.up,
    down: migration_20260830_010000_masterclass_date.down,
    name: '20260830_010000_masterclass_date',
  },
  {
    up: migration_20260901_120000_funnel_on_our_site.up,
    down: migration_20260901_120000_funnel_on_our_site.down,
    name: '20260901_120000_funnel_on_our_site',
  },
];
