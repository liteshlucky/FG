'use client';

import { useRef, useState, useEffect } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (imageData: string) => void;
    onCancel: () => void;
    title?: string;
}

export default function CameraCapture({ onCapture, onCancel, title = "Take a Selfie" }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            setLoading(true);
            setError('');

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user', // Front camera for selfie
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            setLoading(false);
        } catch (err) {
            console.error('Camera error:', err);
            setError('Unable to access camera. Please grant camera permissions and try again.');
            setLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to base64
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedImage(imageData);
                stopCamera();
            }
        }
    };

    const retake = () => {
        setCapturedImage(null);
        startCamera();
    };

    const confirm = () => {
        if (capturedImage) {
            onCapture(capturedImage);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
            <div className="relative w-full max-w-lg mx-4">
                {/* Header */}
                <div className="mb-4 text-center">
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <p className="mt-1 text-sm text-gray-300">
                        {capturedImage ? 'Review your photo' : 'Position your face in the center'}
                    </p>
                </div>

                {/* Camera/Preview Area */}
                <div className="relative overflow-hidden rounded-lg bg-gray-900">
                    {error ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <X className="h-16 w-16 text-red-500 mb-4" />
                            <p className="text-white mb-4">{error}</p>
                            <button
                                onClick={onCancel}
                                className="rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="text-white">Starting camera...</div>
                        </div>
                    ) : capturedImage ? (
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-auto"
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-auto transform scale-x-[-1]" // Mirror effect for selfie
                        />
                    )}

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Controls */}
                {!error && !loading && (
                    <div className="mt-6 flex justify-center space-x-4">
                        {capturedImage ? (
                            <>
                                <button
                                    onClick={retake}
                                    className="flex items-center rounded-lg bg-gray-600 px-6 py-3 text-white hover:bg-gray-700"
                                >
                                    <RotateCcw className="mr-2 h-5 w-5" />
                                    Retake
                                </button>
                                <button
                                    onClick={confirm}
                                    className="flex items-center rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
                                >
                                    <Check className="mr-2 h-5 w-5" />
                                    Confirm
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onCancel}
                                    className="flex items-center rounded-lg bg-gray-600 px-6 py-3 text-white hover:bg-gray-700"
                                >
                                    <X className="mr-2 h-5 w-5" />
                                    Cancel
                                </button>
                                <button
                                    onClick={capturePhoto}
                                    className="flex items-center rounded-lg bg-blue-600 px-8 py-3 text-lg font-bold text-white hover:bg-blue-700"
                                >
                                    <Camera className="mr-2 h-6 w-6" />
                                    Capture
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
