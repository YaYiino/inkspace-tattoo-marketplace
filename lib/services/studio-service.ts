import type { Database } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { ApiError, NotFoundError } from '@/lib/errors/api-error-handler'

type Studio = Database['public']['Tables']['studios']['Row']
type StudioInsert = Database['public']['Tables']['studios']['Insert']
type StudioUpdate = Database['public']['Tables']['studios']['Update']

export class StudioService {
  private supabase = createClient()

  async getStudios(filters?: {
    city?: string
    state?: string
    minPrice?: number
    maxPrice?: number
    amenities?: string[]
  }): Promise<Studio[]> {
    let query = this.supabase
      .from('studios')
      .select('*')
      .eq('is_active', true)

    if (filters?.city) {
      query = query.eq('city', filters.city)
    }
    
    if (filters?.state) {
      query = query.eq('state', filters.state)
    }
    
    if (filters?.minPrice) {
      query = query.gte('hourly_rate', filters.minPrice)
    }
    
    if (filters?.maxPrice) {
      query = query.lte('hourly_rate', filters.maxPrice)
    }

    const { data, error } = await query

    if (error) {
      throw new ApiError(`Failed to fetch studios: ${error.message}`)
    }

    return data || []
  }

  async getStudioById(id: string): Promise<Studio> {
    const { data, error } = await this.supabase
      .from('studios')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Studio with id ${id} not found`)
      }
      throw new ApiError(`Failed to fetch studio: ${error.message}`)
    }

    return data
  }

  async createStudio(studioData: StudioInsert): Promise<Studio> {
    const { data, error } = await this.supabase
      .from('studios')
      .insert(studioData)
      .select()
      .single()

    if (error) {
      throw new ApiError(`Failed to create studio: ${error.message}`)
    }

    return data
  }

  async updateStudio(id: string, updates: StudioUpdate): Promise<Studio> {
    const { data, error } = await this.supabase
      .from('studios')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Studio with id ${id} not found`)
      }
      throw new ApiError(`Failed to update studio: ${error.message}`)
    }

    return data
  }
}

export const studioService = new StudioService()