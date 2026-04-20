import { useState, useCallback } from 'react';

const DRIVE_API_URL = 'https://script.google.com/macros/s/AKfycbymLV1RhtlM2vMLSzmxwsKobnjF3CpTjRHFzbgaNXi-Uh-23yrs-VLvslIgBrV-yEZf7w/exec';
const DRIVE_FOLDER_ID = '1Otottj5OHWtAszwKm_MQMIuByt_UBLW8';

async function compressImage(file, maxWidth = 400, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const width = Math.min(img.width, maxWidth);
                const height = (img.height * width) / img.width;
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob && blob.size > 0) {
                        const r = new FileReader();
                        r.onloadend = () => resolve(r.result.split(',')[1]);
                        r.onerror = () => resolve(null);
                        r.readAsDataURL(blob);
                    } else {
                        resolve(null);
                    }
                }, 'image/webp', quality);
            };
            img.onerror = () => resolve(null);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

export function useImageStorage() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const uploadImage = useCallback(async (file, productId) => {
        if (!file) return { success: false, error: 'Sin archivo' };

        setUploading(true);
        setError(null);

        try {
            const base64 = await compressImage(file, 400, 0.7);
            if (!base64) {
                return { success: false, error: 'Error al comprimir imagen' };
            }

            const filename = `${productId || 'new'}_${Date.now()}.webp`;
            
            console.log('[ImageStorage] Subiendo a:', DRIVE_API_URL);
            
            const response = await fetch(DRIVE_API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Accept': 'application/json' },
                body: JSON.stringify({ action: 'UPLOAD_IMAGE', filename, data: base64, folderId: DRIVE_FOLDER_ID })
            });

            console.log('[ImageStorage] Response status:', response.status);

            if (!response.ok) {
                console.error('[ImageStorage] Error HTTP:', response.status);
                return { success: false, error: 'Error de conexión: ' + response.status };
            }

            const result = await response.json();
            console.log('[ImageStorage] Result:', result);
            
            if (result.status === 'success' && result.thumbnailUrl) {
                return { 
                    success: true, 
                    filename, 
                    url: result.thumbnailUrl,
                    fileId: result.fileId 
                };
            }

            return { success: false, error: result.message || 'Error en respuesta' };
        } catch (err) {
            setError(err.message);
            console.error('Upload error:', err);
            return { success: false, error: err.message };
        } finally {
            setUploading(false);
        }
    }, []);

    const getImageUrl = useCallback((url) => {
        if (!url) return null;
        if (url.startsWith('data:')) return url;
        if (url.startsWith('blob:')) return url;
        if (url.includes('drive.google.com')) return url;
        if (url.includes('unsplash.com')) return url;
        if (url.includes('images.unsplash')) return url;
        return url;
    }, []);

    return { uploadImage, getImageUrl, uploading, error };
}
