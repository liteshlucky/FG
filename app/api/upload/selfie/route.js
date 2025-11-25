import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { image, userId, action } = body; // image is base64, action is 'checkin' or 'checkout'

        if (!image) {
            return NextResponse.json(
                { success: false, error: 'Image data is required' },
                { status: 400 }
            );
        }

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: 'gym-attendance',
            public_id: `${userId}_${action}_${Date.now()}`,
            transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' }
            ]
        });

        console.log('✅ Photo uploaded to Cloudinary:', uploadResponse.secure_url);

        return NextResponse.json({
            success: true,
            data: {
                url: uploadResponse.secure_url,
                publicId: uploadResponse.public_id
            }
        });

    } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}
