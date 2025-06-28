import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, Check, Share2, Eye, Settings } from 'lucide-react';
import { CustomerService } from '../services/customerService';
import { supabase } from '../lib/supabase';

interface QRCodeGeneratorProps {
  restaurantId?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ restaurantId }) => {
  const [qrCodeURL, setQrCodeURL] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurantId();
  }, [restaurantId]);

  const fetchRestaurantId = async () => {
    try {
      setLoading(true);
      
      // Use provided restaurant ID or get current user's restaurant
      let targetRestaurantId = restaurantId;
      
      if (!targetRestaurantId) {
        // Get current user's restaurant ID (for manager dashboard)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: staff } = await supabase
            .from('staff')
            .select('restaurant_id')
            .eq('user_id', user.id)
            .single();
          
          if (staff) {
            targetRestaurantId = staff.restaurant_id;
          }
        }
      }

      if (targetRestaurantId) {
        setCurrentRestaurantId(targetRestaurantId);
        const url = CustomerService.generateQRCodeURL(targetRestaurantId);
        setQrCodeURL(url);
      }
    } catch (error) {
      console.error('Error fetching restaurant ID:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadQRCode = () => {
    // In a real implementation, you would generate an actual QR code image
    // For now, we'll just copy the URL
    copyToClipboard(qrCodeURL);
  };

  const previewWallet = () => {
    // Open the customer wallet in a new tab
    window.open(qrCodeURL, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
          <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Customer QR Code</h3>
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* QR Code Display */}
      <div className="text-center mb-6">
        <div className="w-48 h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center">
            <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">QR Code</p>
            <p className="text-xs text-gray-400">Scan to join loyalty program</p>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-600 font-mono break-all">
            {qrCodeURL}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={previewWallet}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white rounded-xl hover:shadow-lg transition-all duration-200"
        >
          <Eye className="h-4 w-4" />
          Preview Customer Experience
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => copyToClipboard(qrCodeURL)}
            className="flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          
          <button
            onClick={downloadQRCode}
            className="flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
          <Share2 className="h-4 w-4" />
          Share QR Code
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Display this QR code at your restaurant</li>
          <li>• Customers scan to join your loyalty program</li>
          <li>• They earn points automatically with purchases</li>
          <li>• Track all activity in this dashboard</li>
        </ul>
      </div>
    </div>
  );
};

export default QRCodeGenerator;