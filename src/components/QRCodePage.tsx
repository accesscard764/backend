import React from 'react';
import { QrCode, Users, Smartphone, TrendingUp } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';

const QRCodePage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
          <p className="text-gray-600">Generate and manage QR codes for customer onboarding</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">QR Scans</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-100 text-green-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">New Signups</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Mobile Users</p>
              <p className="text-2xl font-bold text-gray-900">0%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">0%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* QR Code Generator */}
        <div className="xl:col-span-1">
          <QRCodeGenerator />
        </div>

        {/* Instructions and Tips */}
        <div className="xl:col-span-2 space-y-6">
          {/* Setup Instructions */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup Instructions</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#1E2A78] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Display Your QR Code</h4>
                  <p className="text-sm text-gray-600">Print and place the QR code at your restaurant entrance, tables, or checkout counter.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#1E2A78] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Customer Scans</h4>
                  <p className="text-sm text-gray-600">Customers scan the code with their phone camera to join your loyalty program.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#1E2A78] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Automatic Enrollment</h4>
                  <p className="text-sm text-gray-600">New customers are automatically enrolled and receive welcome bonus points.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#1E2A78] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Track Progress</h4>
                  <p className="text-sm text-gray-600">Monitor signups and engagement through your dashboard analytics.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Best Practices</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Placement Tips</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Place at eye level for easy scanning</li>
                  <li>• Ensure good lighting around the code</li>
                  <li>• Use table tents for dining areas</li>
                  <li>• Add to receipts and takeout bags</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Promotion Ideas</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Offer bonus points for first scan</li>
                  <li>• Train staff to mention the program</li>
                  <li>• Include in social media posts</li>
                  <li>• Add to email signatures</li>
                </ul>
              </div>
            </div>
          </div>

          {/* QR Code Formats */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Formats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border border-gray-200 rounded-xl hover:border-[#1E2A78] transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Standard</p>
                <p className="text-xs text-gray-500">300x300px</p>
              </div>
              
              <div className="text-center p-4 border border-gray-200 rounded-xl hover:border-[#1E2A78] transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Large</p>
                <p className="text-xs text-gray-500">600x600px</p>
              </div>
              
              <div className="text-center p-4 border border-gray-200 rounded-xl hover:border-[#1E2A78] transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Print</p>
                <p className="text-xs text-gray-500">High-res PDF</p>
              </div>
              
              <div className="text-center p-4 border border-gray-200 rounded-xl hover:border-[#1E2A78] transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Vector</p>
                <p className="text-xs text-gray-500">SVG format</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;