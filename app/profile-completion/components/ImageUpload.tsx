'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

interface ImageUploadProps {
  images: File[]
  onImagesChange: (images: File[]) => void
  maxImages: number
  bucketName: string
  label: string
  description?: string
}

interface ImagePreview {
  file: File
  preview: string
}

export function ImageUpload({ 
  images, 
  onImagesChange, 
  maxImages, 
  bucketName, 
  label, 
  description 
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<ImagePreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit
      return isImage && isValidSize
    })

    const remainingSlots = maxImages - images.length
    const filesToAdd = validFiles.slice(0, remainingSlots)

    // Create previews
    const newPreviews: ImagePreview[] = []
    filesToAdd.forEach(file => {
      const preview = URL.createObjectURL(file)
      newPreviews.push({ file, preview })
    })

    setPreviews(prev => [...prev, ...newPreviews])
    onImagesChange([...images, ...filesToAdd])
  }

  const removeImage = (index: number) => {
    const preview = previews[index]
    if (preview) {
      URL.revokeObjectURL(preview.preview)
    }
    
    const newPreviews = previews.filter((_, i) => i !== index)
    const newImages = images.filter((_, i) => i !== index)
    
    setPreviews(newPreviews)
    onImagesChange(newImages)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  // Clean up preview URLs on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(preview => {
        URL.revokeObjectURL(preview.preview)
      })
    }
  }, [])

  const canAddMore = images.length < maxImages

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 mb-3">{description}</p>
        )}
      </div>

      {/* Upload Area */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-900">
                Drop images here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG up to 10MB ({maxImages - images.length} remaining)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={preview.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeImage(index)
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* File Size */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {(preview.file.size / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Status */}
      {uploading && (
        <div className="text-center text-sm text-gray-600">
          <div className="inline-flex items-center">
            <div className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            Uploading images...
          </div>
        </div>
      )}

      {/* Images Summary */}
      {images.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          {images.length} of {maxImages} images selected
        </div>
      )}
    </div>
  )
}

// Utility function to upload images to Supabase Storage
export async function uploadImages(
  files: File[],
  bucketName: string,
  folder: string,
  userId: string
): Promise<string[]> {
  const supabase = createClient()
  const uploadPromises = files.map(async (file, index) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${folder}/${Date.now()}-${index}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      throw new Error(`Failed to upload ${file.name}: ${error.message}`)
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)
    
    return publicUrl
  })

  return Promise.all(uploadPromises)
}