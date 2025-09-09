import { Metadata } from 'next'
import { Studio } from './types'

export const DEFAULT_SEO = {
  title: 'Antsss - Tattoo Artist Marketplace',
  description: 'Connect tattoo artists with studios worldwide. The Airbnb for tattoo studios. Find available studio space or list your studio for artists.',
  keywords: 'tattoo, studio, artist, marketplace, booking, space, rental, guest spot, tattoo convention',
  openGraph: {
    type: 'website',
    siteName: 'Antsss',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Antsss - Tattoo Artist Marketplace'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Antsss - Tattoo Artist Marketplace',
    description: 'Connect tattoo artists with studios worldwide. The Airbnb for tattoo studios.',
    images: ['/og-image.jpg']
  }
}

export const generateStudioPageMetadata = (studio: Studio): Metadata => {
  const location = [studio.city, studio.state, studio.country]
    .filter(Boolean)
    .join(', ')

  const title = `${studio.name} - Tattoo Studio in ${location} | Antsss`
  const description = studio.description 
    ? `Book ${studio.name} in ${location}. ${studio.description.substring(0, 120)}... Starting at $${studio.hourly_rate}/hour.`
    : `Book ${studio.name}, a professional tattoo studio in ${location}. Starting at $${studio.hourly_rate}/hour. View availability and book instantly.`

  return {
    title,
    description,
    keywords: `tattoo studio, ${studio.name}, ${studio.city}, ${studio.state}, tattoo booking, guest spot, ${studio.amenities?.join(', ') || ''}`,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Antsss',
      images: studio.images?.length 
        ? [
            {
              url: studio.images[0],
              width: 1200,
              height: 630,
              alt: `${studio.name} - Tattoo Studio`
            }
          ]
        : DEFAULT_SEO.openGraph.images
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: studio.images?.length ? [studio.images[0]] : ['/og-image.jpg']
    },
    alternates: {
      canonical: `/studios/${studio.id}`
    },
    other: {
      'business:contact_data:locality': studio.city || '',
      'business:contact_data:region': studio.state || '',
      'business:contact_data:country_name': studio.country || '',
      'business:hours:day': 'monday,tuesday,wednesday,thursday,friday,saturday',
      'product:price:amount': studio.hourly_rate?.toString() || '',
      'product:price:currency': 'USD'
    }
  }
}

export const generateStudiosListMetadata = (
  city?: string,
  state?: string,
  totalResults?: number
): Metadata => {
  let title = 'Find Tattoo Studios'
  let description = 'Discover amazing tattoo studios around the world. Book studio time, find guest spots, or explore new locations.'

  if (city && state) {
    title = `Tattoo Studios in ${city}, ${state} | Antsss`
    description = `Find and book tattoo studios in ${city}, ${state}. ${totalResults || 'Multiple'} studios available for booking. View photos, amenities, and book instantly.`
  } else if (city) {
    title = `Tattoo Studios in ${city} | Antsss`
    description = `Discover tattoo studios in ${city}. Browse available spaces, compare amenities, and book your next tattoo session.`
  } else if (state) {
    title = `Tattoo Studios in ${state} | Antsss`
    description = `Explore tattoo studios across ${state}. Find the perfect space for your next tattoo project.`
  }

  return {
    title,
    description,
    keywords: `tattoo studios, ${city || ''}, ${state || ''}, studio booking, guest spots, tattoo space rental`,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Antsss',
      images: DEFAULT_SEO.openGraph.images
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.jpg']
    },
    alternates: {
      canonical: '/studios'
    }
  }
}

export const generateStudioSlug = (studio: Studio): string => {
  // Generate SEO-friendly URL slug
  const name = studio.name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()

  const location = [studio.city, studio.state]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')

  return location ? `${name}-${location}` : name
}

export const formatBusinessHours = (availability: any[]): string => {
  // Convert availability to structured business hours format
  if (!availability?.length) return 'Hours vary'
  
  // This is a simplified implementation
  // In a real app, you'd analyze the availability patterns
  const hasWeekendAvailability = availability.some(slot => {
    const date = new Date(slot.date)
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
  })

  return hasWeekendAvailability 
    ? 'Open 7 days a week' 
    : 'Open weekdays'
}

export const generateStructuredData = (studio: Studio) => {
  const location = [studio.address, studio.city, studio.state, studio.zip_code]
    .filter(Boolean)
    .join(', ')

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `https://antsss.com/studios/${studio.id}`,
    name: studio.name,
    description: studio.description,
    url: `https://antsss.com/studios/${studio.id}`,
    telephone: '', // Add if available
    address: {
      '@type': 'PostalAddress',
      streetAddress: studio.address,
      addressLocality: studio.city,
      addressRegion: studio.state,
      postalCode: studio.zip_code,
      addressCountry: studio.country || 'US'
    },
    geo: studio.latitude && studio.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: studio.latitude,
      longitude: studio.longitude
    } : undefined,
    priceRange: `$${studio.hourly_rate}/hour`,
    image: studio.images || [],
    serviceArea: {
      '@type': 'AdministrativeArea',
      name: `${studio.city}, ${studio.state}`
    },
    offers: {
      '@type': 'Offer',
      category: 'Tattoo Studio Rental',
      priceSpecification: {
        '@type': 'PriceSpecification',
        price: studio.hourly_rate,
        priceCurrency: 'USD',
        unitText: 'per hour'
      }
    },
    amenityFeature: studio.amenities?.map(amenity => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity
    })) || []
  }
}