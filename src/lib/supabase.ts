import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cbiqcgaplbwqmjwybola.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiaXFjZ2FwbGJ3cW1qd3lib2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDU2OTIsImV4cCI6MjA4NzE4MTY5Mn0.tu6rtJ7uZzilM9AJ-bva7GZK9Z-T7GPK6hLzbHBzgc4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
