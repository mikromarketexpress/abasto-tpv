import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sqccttomtxitncbbjdnk.supabase.co'
const supabaseKey = 'sb_publishable_iuNd5msG7sZhsFvnYc0Itw__mfg-xDU'

export const supabase = createClient(supabaseUrl, supabaseKey)
