'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Studio, StudioSearch } from '@/lib/types'
import { Navigation } from '@/app/components/Navigation'
import Button from '@/app/components/Button'
import StudioSearchFilters from '@/app/components/StudioSearchFilters'
import StudioCard from '@/app/components/StudioCard'
import { generateStudiosListMetadata } from '@/lib/seo'
import Head from 'next/head'

export default function StudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchFilters, setSearchFilters] = useState<StudioSearch>({})
  const [showFilters, setShowFilters] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Initialize search from URL params
  useEffect(() => {
    const urlFilters: StudioSearch = {
      query: searchParams.get('q') || undefined,
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      country: searchParams.get('country') || undefined,
      min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
      max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
      instant_book: searchParams.get('instant_book') === 'true' || undefined,
      amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || undefined,
      equipment: searchParams.get('equipment')?.split(',').filter(Boolean) || undefined
    }
    setSearchFilters(urlFilters)
    searchStudios(urlFilters)
  }, [searchParams])

  const searchStudios = async (filters: StudioSearch = searchFilters) => {
    setLoading(true)
    try {
      let query = supabase
        .from('studios')
        .select('*', { count: 'exact' })
        .eq('is_active', true)

      // Apply filters
      if (filters.query) {
        query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
      }

      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`)
      }

      if (filters.state) {
        query = query.ilike('state', `%${filters.state}%`)
      }

      if (filters.country) {
        query = query.eq('country', filters.country)
      }

      if (filters.min_price) {
        query = query.gte('hourly_rate', filters.min_price)
      }

      if (filters.max_price) {
        query = query.lte('hourly_rate', filters.max_price)
      }

      if (filters.instant_book) {
        query = query.eq('instant_book', true)
      }

      if (filters.amenities && filters.amenities.length > 0) {
        query = query.contains('amenities', filters.amenities)
      }

      if (filters.equipment && filters.equipment.length > 0) {
        query = query.contains('equipment', filters.equipment)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error searching studios:', error)
        return
      }

      setStudios(data || [])
      setTotalResults(count || 0)
    } catch (error) {
      console.error('Error searching studios:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSearchFilters = useCallback((newFilters: StudioSearch) => {
    setSearchFilters(newFilters)
    
    // Update URL params
    const params = new URLSearchParams()
    
    if (newFilters.query) params.set('q', newFilters.query)
    if (newFilters.city) params.set('city', newFilters.city)
    if (newFilters.state) params.set('state', newFilters.state)
    if (newFilters.country) params.set('country', newFilters.country)
    if (newFilters.min_price) params.set('min_price', newFilters.min_price.toString())
    if (newFilters.max_price) params.set('max_price', newFilters.max_price.toString())
    if (newFilters.instant_book) params.set('instant_book', 'true')
    if (newFilters.amenities?.length) params.set('amenities', newFilters.amenities.join(','))
    if (newFilters.equipment?.length) params.set('equipment', newFilters.equipment.join(','))

    const newUrl = params.toString() ? `/studios?${params.toString()}` : '/studios'
    router.push(newUrl, { scroll: false })
    
    searchStudios(newFilters)
  }, [router])

  const clearFilters = () => {
    const emptyFilters: StudioSearch = {}
    setSearchFilters(emptyFilters)
    router.push('/studios')
    searchStudios(emptyFilters)
  }

  const hasActiveFilters = Object.values(searchFilters).some(value => 
    value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Find Studios</h1>
              <p className="text-gray-600 mt-2">
                Discover amazing tattoo studios around the world
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </Button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mt-6">
            <div className="relative max-w-xl">
              <input
                type="text"
                value={searchFilters.query || ''}
                onChange={(e) => updateSearchFilters({ ...searchFilters, query: e.target.value })}
                placeholder="Search studios by name or description..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-80 flex-shrink-0`}>
            <div className="sticky top-8">
              <StudioSearchFilters
                filters={searchFilters}
                onFiltersChange={updateSearchFilters}
                onClearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {loading ? 'Searching...' : `${totalResults} studios found`}
                </h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-purple-600 hover:text-purple-800 transition-colors mt-1"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Sort by: <span className="font-medium">Most Recent</span>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                    <div className="aspect-video bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Studios Grid */}
            {!loading && studios.length > 0 && (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {studios.map((studio) => (
                  <StudioCard key={studio.id} studio={studio} />
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && studios.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-24 h-24 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Studios Found</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  We couldn't find any studios matching your criteria. Try adjusting your filters or search terms.
                </p>
                <div className="space-x-4">
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                  <Button onClick={() => router.push('/')}>
                    Back to Home
                  </Button>
                </div>
              </div>
            )}

            {/* Load More */}
            {!loading && studios.length > 0 && studios.length < totalResults && (
              <div className="text-center mt-8">
                <Button variant="outline" onClick={() => {}}>
                  Load More Studios
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}