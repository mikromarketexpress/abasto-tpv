import { Package } from 'lucide-react'
import { gsService } from './googleSheetsService'

export const GOOGLE_DRIVE_FOLDER_ID = "1Otottj5OHWtAszwKm_MQMIuByt_UBLW8";

export const DEFAULT_PRODUCT_IMAGE = "C:\\Users\\edson\\Documents\\APP WEB\\MICRO MARKET EXPRESS\\assets\\img\\subir_imagen.png";

export const isDriveUrl = (url) => {
    if (!url || typeof url !== 'string') return false
    return url.includes('drive.google.com') || url.includes('drive.googleusercontent.com') || url.includes('docs.google.com') || /^[a-zA-Z0-9_-]{20,}$/.test(url)
}

export const extractDriveId = (url) => {
    if (!url || typeof url !== 'string') return null
    
    const patterns = [
        /\/d\/([a-zA-Z0-9_-]{20,})\//,
        /id=([a-zA-Z0-9_-]{20,})/,
        /([a-zA-Z0-9_-]{20,})(?:\?|$)/
    ]
    
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match && match[1]) return match[1]
    }
    
    if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
        return url
    }
    
    return null
}

export const formatDriveImageUrl = (url) => {
    if (!url || typeof url !== 'string') return DEFAULT_PRODUCT_IMAGE
    
    if (!isDriveUrl(url)) {
        if (url.startsWith('data:') || url.startsWith('http')) return url
        return DEFAULT_PRODUCT_IMAGE
    }
    
    const fileId = extractDriveId(url)
    if (!fileId) return DEFAULT_PRODUCT_IMAGE
    
    return `https://lh3.googleusercontent.com/d/${fileId}=w400-h400?authuser=0`
}

export const getProductImageUrl = (product) => {
    if (!product) return DEFAULT_PRODUCT_IMAGE
    
    // 1. Check if there's an image explicitly defined
    const imgUrl = product.imagen_url || product.imagen || product.imagenUrl
    
    // 2. If no image is explicitly defined, or if it is empty, check dynamic Google Drive map!
    if (!imgUrl || imgUrl === DEFAULT_PRODUCT_IMAGE || imgUrl === '') {
        const key = String(product.id || '').toLowerCase().trim();
        if (gsService.cache && gsService.cache.driveFiles && gsService.cache.driveFiles[key]) {
            const fileId = gsService.cache.driveFiles[key];
            return `https://lh3.googleusercontent.com/d/${fileId}=w400-h400?authuser=0`;
        }
        return DEFAULT_PRODUCT_IMAGE
    }
    
    if (imgUrl === DEFAULT_PRODUCT_IMAGE) return imgUrl
    
    return formatDriveImageUrl(imgUrl)
}