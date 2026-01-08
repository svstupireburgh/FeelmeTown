'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

interface FakePaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentData: any) => void;
  amount: number;
  bookingData: any;
}

export default function FakePaymentPopup({ 
  isOpen, 
  onClose, 
  onPaymentSuccess, 
  amount, 
  bookingData 
}: FakePaymentPopupProps) {
  const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [expiryDate, setExpiryDate] = useState('12/25');
  const [cvv, setCvv] = useState('123');
  const [cardName, setCardName] = useState('Test User');
  const [upiId, setUpiId] = useState('test@paytm');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    setIsProcessing(true);
    setStep('processing');

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate fake payment data
    const fakePaymentData = {
      razorpay_order_id: `fake_order_${Date.now()}`,
      razorpay_payment_id: `fake_payment_${Date.now()}`,
      razorpay_signature: `fake_signature_${Date.now()}`,
      amount: amount,
      currency: 'INR',
      method: paymentMethod,
      status: 'captured',
      created_at: Date.now()
    };

    setStep('success');
    
    // Wait a bit then call success callback
    setTimeout(() => {
      onPaymentSuccess(fakePaymentData);
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    if (step === 'processing') return; // Don't allow closing during processing
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      style={{ zIndex: 999999999 }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Test Payment</h2>
          {step !== 'processing' && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Payment Details */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Booking Details</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Name:</span> {bookingData?.name}</p>
                <p><span className="font-medium">Theater:</span> {bookingData?.theaterName}</p>
                <p><span className="font-medium">Date:</span> {bookingData?.date}</p>
                <p><span className="font-medium">Time:</span> {bookingData?.time}</p>
                <p><span className="font-medium">Occasion:</span> {bookingData?.occasion}</p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-800">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">₹{amount}</span>
              </div>
            </div>
          </div>

          {step === 'details' && (
            <>
              {/* Payment Method Selection */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Payment Method</h3>
                <div className="space-y-2">
                  {[
                    { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
                    { id: 'upi', label: 'UPI', icon: '📱' },
                    { id: 'netbanking', label: 'Net Banking', icon: '🏦' }
                  ].map((method) => (
                    <label key={method.id} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="mr-3"
                      />
                      <span className="mr-2">{method.icon}</span>
                      <span className="font-medium">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Form */}
              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="123"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="yourname@paytm"
                  />
                </div>
              )}

              {paymentMethod === 'netbanking' && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏦</div>
                  <p className="text-gray-600">Net Banking simulation</p>
                  <p className="text-sm text-gray-500">This is a test payment</p>
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={handlePayment}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Pay ₹{amount}
              </button>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Processing Payment</h3>
              <p className="text-gray-600">Please wait while we process your payment...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Your booking has been confirmed.</p>
            </div>
          )}

          {/* Test Info */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">🧪 Test Mode</h4>
            <p className="text-sm text-yellow-700">
              This is a fake payment popup for testing. No real payment will be processed.
              Click "Pay" to simulate successful payment.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
