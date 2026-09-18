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
import * as migration_20260901_120000_funnel_on_our_site from './20260901_120000_funnel_on_our_site'
import * as migration_20260901_180000_nest_register from './20260901_180000_nest_register';
import * as migration_20260917_160000_masterclass_sept24 from './20260917_160000_masterclass_sept24';
import * as migration_20260917_193000_register_on_app_host from './20260917_193000_register_on_app_host';
import * as migration_20260917_200000_register_on_public_host from './20260917_200000_register_on_public_host';
import * as migration_20260917_210000_no_links_left_on_ghl from './20260917_210000_no_links_left_on_ghl';
import * as migration_20260918_120000_masterclass_mvp_copy from './20260918_120000_masterclass_mvp_copy';
import * as migration_20260918_190000_live_join_url from './20260918_190000_live_join_url';
import * as migration_20260918_193000_masterclass_sixty_plus_qa from './20260918_193000_masterclass_sixty_plus_qa';
import * as migration_20260918_213000_join_live_switch from './20260918_213000_join_live_switch';
import * as migration_20260918_224500_masterclass_founder_copy from './20260918_224500_masterclass_founder_copy';

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
  {
    up: migration_20260901_180000_nest_register.up,
    down: migration_20260901_180000_nest_register.down,
    name: '20260901_180000_nest_register',
  },
  {
    up: migration_20260917_160000_masterclass_sept24.up,
    down: migration_20260917_160000_masterclass_sept24.down,
    name: '20260917_160000_masterclass_sept24',
  },
  {
    up: migration_20260917_193000_register_on_app_host.up,
    down: migration_20260917_193000_register_on_app_host.down,
    name: '20260917_193000_register_on_app_host',
  },
  {
    up: migration_20260917_200000_register_on_public_host.up,
    down: migration_20260917_200000_register_on_public_host.down,
    name: '20260917_200000_register_on_public_host',
  },
  {
    up: migration_20260917_210000_no_links_left_on_ghl.up,
    down: migration_20260917_210000_no_links_left_on_ghl.down,
    name: '20260917_210000_no_links_left_on_ghl',
  },
  {
    up: migration_20260918_120000_masterclass_mvp_copy.up,
    down: migration_20260918_120000_masterclass_mvp_copy.down,
    name: '20260918_120000_masterclass_mvp_copy',
  },
  {
    up: migration_20260918_190000_live_join_url.up,
    down: migration_20260918_190000_live_join_url.down,
    name: '20260918_190000_live_join_url',
  },
  {
    up: migration_20260918_193000_masterclass_sixty_plus_qa.up,
    down: migration_20260918_193000_masterclass_sixty_plus_qa.down,
    name: '20260918_193000_masterclass_sixty_plus_qa',
  },
  {
    up: migration_20260918_213000_join_live_switch.up,
    down: migration_20260918_213000_join_live_switch.down,
    name: '20260918_213000_join_live_switch',
  },
  {
    up: migration_20260918_224500_masterclass_founder_copy.up,
    down: migration_20260918_224500_masterclass_founder_copy.down,
    name: '20260918_224500_masterclass_founder_copy',
  },
];
