
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ixseupgiqkfgmsalhlgt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4c2V1cGdpcWtmZ21zYWxobGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjIxMDcsImV4cCI6MjA3NzEzODEwN30.x9Sr_SwbKLfwbLWTuoBaHoZDKyxpyqMjJX71hdyd_64'
export const supabase = createClient(supabaseUrl, supabaseKey)