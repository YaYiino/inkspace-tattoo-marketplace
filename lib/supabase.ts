import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from './types'

export const createClient = () => createClientComponentClient<Database>()

export const createServerClient = () => createServerComponentClient<Database>({ cookies })