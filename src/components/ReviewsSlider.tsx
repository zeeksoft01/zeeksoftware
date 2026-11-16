import React, { useState, useEffect } from 'react';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MessageSquarePlus,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { CustomerReview } from '../types';
import { api } from '../api/client';

interface ReviewsSliderProps {
  reviews: CustomerReview[];
  onReviewSubmitted?: () => void;
}

export const ReviewsSlider: React.FC<ReviewsSliderProps> = ({ reviews, onReviewSubmitted }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [productPurchased, setProductPurchased] = useState('');
  const [orderId, setOrderId] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState(''); // Anti-spam: 3 + 4 = ?
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const approvedReviews = reviews.filter((r) => r.isApproved);

  const handleNext = () => {
    if (approvedReviews.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % approvedReviews.length);
  };

  const handlePrev = () => {
    if (approvedReviews.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + approvedReviews.length) % approvedReviews.length);
  };

  useEffect(() => {
    if (approvedReviews.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [currentIndex, isPaused, approvedReviews.length]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Spam protection check
    if (securityAnswer.trim() !== '7') {
      setSubmitError('Anti-spam check failed: What is 3 + 4? Please enter 7.');
      return;
    }

    if (!customerName.trim() || !reviewMessage.trim()) {
      setSubmitError('Please enter your name and feedback.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.submitReview({
        customerName: customerName.trim(),
        rating,
        reviewMessage: reviewMessage.trim(),
        productPurchased: productPurchased.trim() || undefined,
        orderId: orderId.trim() || undefined,
      });

      setSubmitSuccess(true);
      setCustomerName('');
      setReviewMessage('');
      setProductPurchased('');
      setOrderId('');
      setSecurityAnswer('');
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="py-20 bg-[#F5F7FA] relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="text-xs font-bold text-[#FF7900] tracking-widest uppercase block mb-1">
              Verified Feedback
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#061B45] tracking-tight">
              What Our Customers Are Saying
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-xl">
              Your feedback helps us improve and serve you better. We display reviews verified by our admin team.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsModalOpen(true);
                setSubmitSuccess(false);
              }}
              className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Share Feedback</span>
            </button>

            {approvedReviews.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="w-9 h-9 rounded-full bg-white hover:bg-[#FF7900] hover:text-white text-[#061B45] flex items-center justify-center transition-colors shadow-sm border border-slate-200"
                  aria-label="Previous Review"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-9 h-9 rounded-full bg-white hover:bg-[#FF7900] hover:text-white text-[#061B45] flex items-center justify-center transition-colors shadow-sm border border-slate-200"
                  aria-label="Next Review"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Presentation */}
        {approvedReviews.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
              <Star className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-[#061B45]">Be the First to Review</h4>
            <p className="text-sm text-slate-600">
              We value genuine experiences. If you recently purchased a plan from Zeek Softwares, share your honest feedback with us!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-zeek-orange px-6 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase inline-flex items-center gap-2"
            >
              Write a Review
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(approvedReviews.length <= 3
              ? approvedReviews
              : [
                  ...approvedReviews.slice(currentIndex, currentIndex + 3),
                  ...approvedReviews.slice(0, Math.max(0, currentIndex + 3 - approvedReviews.length)),
                ].slice(0, 3)
            ).map((review, idx) => (
              <div
                key={`${review.id}-${idx}`}
                className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow border border-slate-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Star Rating */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {review.reviewDate}
                    </span>
                  </div>

                  {/* Review Text */}
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    "{review.reviewMessage}"
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#061B45]">
                      {review.customerName}
                    </h4>
                    {review.productPurchased && (
                      <span className="text-[11px] font-semibold text-[#FF7900] block">
                        Verified: {review.productPurchased}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Review Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pb-24 sm:pb-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 mb-6">
              <span className="text-xs font-bold text-[#FF7900] tracking-wider uppercase">
                Customer Testimonial
              </span>
              <h3 className="text-xl font-extrabold text-[#061B45]">
                Share Your Zeek Softwares Experience
              </h3>
              <p className="text-xs text-slate-500">
                Submissions are reviewed by our administration before being featured on the website.
              </p>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-900">
                  Thank You for Your Feedback!
                </h4>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Your review has been successfully submitted. Once approved by our team, it will appear in the customer testimonials section.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="btn-zeek-orange px-5 py-2 rounded-lg text-xs font-bold uppercase mt-2"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Your Name / Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Samuel A."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Rating <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1 py-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className="p-1 focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Software Purchased
                    </label>
                    <input
                      type="text"
                      name="productPurchased"
                      autoComplete="on"
                      value={productPurchased}
                      onChange={(e) => setProductPurchased(e.target.value)}
                      placeholder="e.g. Canva Pro 1 Year"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Order ID (Optional for verification)
                  </label>
                  <input
                    type="text"
                    name="orderId"
                    autoComplete="on"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="e.g. ZEEK-ORD-849201"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Your Review Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="reviewMessage"
                    autoComplete="on"
                    required
                    rows={3}
                    value={reviewMessage}
                    onChange={(e) => setReviewMessage(e.target.value)}
                    placeholder="Describe your purchase and activation experience with Zeek Softwares..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                  />
                </div>

                {/* Anti-spam math captcha */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Security Verification: What is 3 + 4? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="securityAnswer"
                    autoComplete="off"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Type the number 7"
                    className="w-24 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback for Approval'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
