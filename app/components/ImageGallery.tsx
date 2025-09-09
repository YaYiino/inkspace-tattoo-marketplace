'use client'

import { useState } from 'react'

interface ImageGalleryProps {
  images: string[]
  studioName: string
}

export default function ImageGallery({ images, studioName }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [imageError, setImageError] = useState<Set<number>>(new Set())

  const handleImageError = (index: number) => {
    setImageError(prev => new Set([...prev, index]))
  }

  const validImages = images.filter((_, index) => !imageError.has(index))

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium mb-1">No Photos Available</p>
          <p className="text-sm">This studio hasn't added photos yet</p>
        </div>
      </div>
    )
  }

  const openLightbox = (index: number) => {
    if (!imageError.has(index)) {
      setSelectedImage(index)
    }
  }

  const closeLightbox = () => {
    setSelectedImage(null)
  }

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (selectedImage === null) return
    
    const validIndexes = images.map((_, i) => i).filter(i => !imageError.has(i))
    const currentValidIndex = validIndexes.indexOf(selectedImage)
    
    let newValidIndex
    if (direction === 'prev') {
      newValidIndex = currentValidIndex > 0 ? currentValidIndex - 1 : validIndexes.length - 1
    } else {
      newValidIndex = currentValidIndex < validIndexes.length - 1 ? currentValidIndex + 1 : 0
    }
    
    setSelectedImage(validIndexes[newValidIndex])
  }

  // Single image layout
  if (validImages.length === 1) {
    return (
      <div className="relative">
        <div 
          className="aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
          onClick={() => openLightbox(0)}
        >
          <img
            src={images[0]}
            alt={studioName}
            onError={() => handleImageError(0)}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        </div>
        {renderLightbox()}
      </div>
    )
  }

  // Multiple images layout
  const displayImages = images.slice(0, 5)
  
  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-2 h-96">
        {/* Main large image */}
        <div 
          className="col-span-2 row-span-2 bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative"
          onClick={() => openLightbox(0)}
        >
          {!imageError.has(0) ? (
            <img
              src={images[0]}
              alt={`${studioName} - Photo 1`}
              onError={() => handleImageError(0)}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Smaller images */}
        {displayImages.slice(1, 5).map((image, index) => {
          const actualIndex = index + 1
          const isLast = actualIndex === 4 && images.length > 5
          
          return (
            <div
              key={actualIndex}
              className="bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative"
              onClick={() => openLightbox(actualIndex)}
            >
              {!imageError.has(actualIndex) ? (
                <img
                  src={image}
                  alt={`${studioName} - Photo ${actualIndex + 1}`}
                  onError={() => handleImageError(actualIndex)}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {/* Overlay for additional images */}
              {isLast && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-lg">
                  +{images.length - 5}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {renderLightbox()}
    </div>
  )

  function renderLightbox() {
    if (selectedImage === null) return null

    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        {/* Close button */}
        <button
          onClick={closeLightbox}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Previous button */}
        {validImages.length > 1 && (
          <button
            onClick={() => navigateLightbox('prev')}
            className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Next button */}
        {validImages.length > 1 && (
          <button
            onClick={() => navigateLightbox('next')}
            className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Image */}
        <div className="max-w-7xl max-h-full p-4">
          <img
            src={images[selectedImage]}
            alt={`${studioName} - Photo ${selectedImage + 1}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Image counter */}
        {validImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            {selectedImage + 1} of {images.length}
          </div>
        )}
      </div>
    )
  }
}