/* Payload admin layout. Boilerplate — owned by Payload, not by us. */
import type { ServerFunctionClient } from 'payload'

import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'
/**
 * Payload's compiled admin stylesheet. Required, and only in production.
 *
 * `next dev` compiles Payload's SCSS on the fly, so the admin looks perfect
 * locally without this line — but `next build` does not, and the theme variables
 * (`--theme-elevation-*`, the fonts, the reset) live only in this file. Without
 * it every admin rule still ships, inside `@layer payload-default`, referencing
 * variables that were never defined: the panel renders as unstyled Times New
 * Roman with no layout, on a deployment whose build succeeded.
 *
 * Caught by loading `next start` against a cold database rather than trusting
 * `npm run dev` — the one failure mode dev mode cannot show you.
 */
import '@payloadcms/next/css'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
