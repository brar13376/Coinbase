import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  Camera,
  FileText,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const KYC = () => {
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [showImages, setShowImages] = useState(false);
  const { user } = useAuthStore();

  // Fetch KYC status
  const { data: kycData, isLoading: kycLoading, refetch } = useQuery(
    'kycStatus',
    () => axios.get(`${API_BASE_URL}/kyc/status`).then(res => res.data),
    { retry: 1 }
  );

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedDocumentType || !frontImage) {
      toast.error('Please select document type and upload front image');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('documentType', selectedDocumentType);
      formData.append('frontImage', frontImage);
      if (backImage) {
        formData.append('backImage', backImage);
      }

      await axios.post(`${API_BASE_URL}/kyc/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Document uploaded successfully!');
      refetch();
      setFrontImage(null);
      setBackImage(null);
      setSelectedDocumentType('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload document');
    }
  };

  const handleSelfieUpload = async (e) => {
    e.preventDefault();
    
    if (!selfieImage) {
      toast.error('Please select a selfie image');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('selfie', selfieImage);

      await axios.post(`${API_BASE_URL}/kyc/selfie`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Selfie uploaded successfully!');
      refetch();
      setSelfieImage(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload selfie');
    }
  };

  const handleSubmitKYC = async () => {
    try {
      await axios.post(`${API_BASE_URL}/kyc/submit`);
      toast.success('KYC submitted for review!');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit KYC');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-400" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-400" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending Review';
      default:
        return 'Not Started';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (kycLoading) {
    return <LoadingSpinner text="Loading KYC status..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Identity Verification</h1>
          <p className="text-gray-400">Complete your KYC verification to access all features</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowImages(!showImages)}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            {showImages ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            <span>{showImages ? 'Hide' : 'Show'} Images</span>
          </button>
        </div>
      </div>

      {/* KYC Status Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Verification Status</h2>
              <p className="text-gray-400">Current status of your identity verification</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(kycData?.kycStatus)}
            <span className={`text-lg font-medium ${getStatusColor(kycData?.kycStatus)}`}>
              {getStatusText(kycData?.kycStatus)}
            </span>
          </div>
        </div>

        {kycData?.kycStatus === 'rejected' && (
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-red-400 font-medium">Verification Rejected</h3>
                <p className="text-red-200 text-sm mt-1">
                  Your identity verification was rejected. Please review the requirements and submit new documents.
                </p>
              </div>
            </div>
          </div>
        )}

        {kycData?.kycStatus === 'approved' && (
          <div className="bg-green-900 border border-green-600 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <div>
                <h3 className="text-green-400 font-medium">Verification Approved</h3>
                <p className="text-green-200 text-sm mt-1">
                  Your identity has been successfully verified. You now have access to all platform features.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Upload */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Identity Documents</h3>
          
          <form onSubmit={handleDocumentUpload} className="space-y-4">
            <div>
              <label className="form-label">Document Type</label>
              <select
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="form-input"
                required
              >
                <option value="">Select document type</option>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID</option>
              </select>
            </div>

            <div>
              <label className="form-label">Front Image</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFrontImage(e.target.files[0])}
                  className="hidden"
                  id="front-image"
                  required
                />
                <label htmlFor="front-image" className="cursor-pointer">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">
                    {frontImage ? frontImage.name : 'Click to upload front image'}
                  </p>
                  <p className="text-gray-500 text-sm">PNG, JPG up to 5MB</p>
                </label>
              </div>
            </div>

            <div>
              <label className="form-label">Back Image (Optional)</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBackImage(e.target.files[0])}
                  className="hidden"
                  id="back-image"
                />
                <label htmlFor="back-image" className="cursor-pointer">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">
                    {backImage ? backImage.name : 'Click to upload back image'}
                  </p>
                  <p className="text-gray-500 text-sm">PNG, JPG up to 5MB</p>
                </label>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">
              Upload Document
            </button>
          </form>

          {/* Uploaded Documents */}
          {kycData?.documents && kycData.documents.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-white mb-4">Uploaded Documents</h4>
              <div className="space-y-3">
                {kycData.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-white font-medium capitalize">{doc.type.replace('_', ' ')}</p>
                        <p className="text-gray-400 text-sm">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(doc.status)}
                      <span className={`text-sm ${getStatusColor(doc.status)}`}>
                        {getStatusText(doc.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selfie Upload */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Selfie Verification</h3>
          
          <form onSubmit={handleSelfieUpload} className="space-y-4">
            <div>
              <label className="form-label">Selfie Image</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelfieImage(e.target.files[0])}
                  className="hidden"
                  id="selfie-image"
                  required
                />
                <label htmlFor="selfie-image" className="cursor-pointer">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">
                    {selfieImage ? selfieImage.name : 'Click to upload selfie'}
                  </p>
                  <p className="text-gray-500 text-sm">PNG, JPG up to 5MB</p>
                </label>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">
              Upload Selfie
            </button>
          </form>

          {/* Uploaded Selfie */}
          {kycData?.selfieImage && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-white mb-4">Uploaded Selfie</h4>
              <div className="p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Camera className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">Selfie Image</p>
                    <p className="text-gray-400 text-sm">Uploaded successfully</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit KYC */}
      {kycData?.kycStatus === 'not_started' && (
        <div className="card">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-4">Ready to Submit?</h3>
            <p className="text-gray-400 mb-6">
              Make sure you have uploaded all required documents and selfie before submitting for review.
            </p>
            <button
              onClick={handleSubmitKYC}
              className="btn-primary px-8 py-3"
            >
              Submit for Review
            </button>
          </div>
        </div>
      )}

      {/* Requirements */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-6">Verification Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-white mb-3">Document Requirements</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>• Clear, high-quality images</li>
              <li>• All text must be readable</li>
              <li>• Document must be valid and not expired</li>
              <li>• No screenshots or photocopies</li>
              <li>• File size under 5MB</li>
            </ul>
          </div>
          <div>
            <h4 className="text-md font-medium text-white mb-3">Selfie Requirements</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>• Clear, well-lit photo</li>
              <li>• Face must be clearly visible</li>
              <li>• No sunglasses or face coverings</li>
              <li>• Look directly at the camera</li>
              <li>• File size under 5MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYC;