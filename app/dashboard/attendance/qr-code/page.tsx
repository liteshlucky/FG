'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode as QrCodeIcon } from 'lucide-react';

export default function QRCodePage() {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Get the base URL (will be localhost in dev, your domain in production)
    const getBaseUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return 'http://localhost:3000';
    };

    const checkInUrl = `${getBaseUrl()}/attendance/qr-checkin`;

    useEffect(() => {
        // Small delay to ensure canvas is mounted
        const timer = setTimeout(() => {
            generateQRCode();
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    const generateQRCode = async () => {
        setLoading(true);
        try {
            if (canvasRef.current) {
                await QRCode.toCanvas(canvasRef.current, checkInUrl, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                // Also generate data URL for download
                const dataUrl = await QRCode.toDataURL(checkInUrl, {
                    width: 600,
                    margin: 2
                });
                setQrCodeUrl(dataUrl);
            }
        } catch (error) {
            console.error('QR Code generation error:', error);
            alert('Failed to generate QR code. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    };

    const downloadQRCode = () => {
        const link = document.createElement('a');
        link.href = qrCodeUrl;
        link.download = 'gym-attendance-qr-code.png';
        link.click();
    };

    const printQRCode = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Gym Attendance QR Code</title>
                        <style>
                            body {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                                margin: 0;
                                font-family: Arial, sans-serif;
                            }
                            h1 {
                                margin-bottom: 20px;
                                color: #1f2937;
                            }
                            img {
                                border: 2px solid #e5e7eb;
                                border-radius: 8px;
                                padding: 20px;
                            }
                            p {
                                margin-top: 20px;
                                font-size: 18px;
                                color: #6b7280;
                            }
                        </style>
                    </head>
                    <body>
                        <h1>🏋️ Gym Attendance</h1>
                        <img src="${qrCodeUrl}" alt="QR Code" />
                        <p>Scan to Check In / Check Out</p>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">QR Code for Attendance</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Display this QR code at your gym entrance for easy check-in/out
                </p>
            </div>

            {/* QR Code Display */}
            <div className="rounded-lg bg-white p-8 shadow">
                <div className="flex flex-col items-center space-y-6">
                    {/* QR Code */}
                    <div className="rounded-lg border-4 border-gray-200 bg-white p-6">
                        {loading && (
                            <div className="flex h-[300px] w-[300px] items-center justify-center">
                                <div className="text-gray-500">Generating QR Code...</div>
                            </div>
                        )}
                        <canvas
                            ref={canvasRef}
                            style={{ display: loading ? 'none' : 'block' }}
                        />
                    </div>

                    {/* Instructions */}
                    <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 text-lg font-semibold text-gray-900">
                            <QrCodeIcon className="h-6 w-6" />
                            <span>Scan to Check In / Check Out</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                            Members and trainers can scan this code with their phone camera
                        </p>
                    </div>

                    {/* URL Display */}
                    <div className="w-full rounded-lg bg-gray-50 p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase">Check-In URL</p>
                        <p className="mt-1 text-sm text-gray-900 break-all">{checkInUrl}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={generateQRCode}
                            disabled={loading}
                            className="flex items-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <QrCodeIcon className="mr-2 h-4 w-4" />
                            {loading ? 'Generating...' : 'Regenerate QR Code'}
                        </button>
                        <button
                            onClick={downloadQRCode}
                            disabled={loading}
                            className="flex items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download QR Code
                        </button>
                        <button
                            onClick={printQRCode}
                            disabled={loading}
                            className="flex items-center rounded-md bg-gray-600 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Print QR Code
                        </button>
                    </div>
                </div>
            </div>

            {/* Usage Instructions */}
            <div className="rounded-lg bg-blue-50 p-6">
                <h2 className="text-lg font-semibold text-blue-900">How to Use</h2>
                <ol className="mt-4 space-y-2 text-sm text-blue-800">
                    <li className="flex items-start">
                        <span className="mr-2 font-bold">1.</span>
                        <span>Download or print the QR code above</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 font-bold">2.</span>
                        <span>Display it at your gym entrance (on a tablet or printed poster)</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 font-bold">3.</span>
                        <span>Members/trainers scan the code with their phone camera</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 font-bold">4.</span>
                        <span>They enter their membership ID or phone number</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2 font-bold">5.</span>
                        <span>Click "Check In" when arriving or "Check Out" when leaving</span>
                    </li>
                </ol>
            </div>
        </div>
    );
}
