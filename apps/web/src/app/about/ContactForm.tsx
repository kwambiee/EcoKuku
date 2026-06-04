'use client';

import { useState } from 'react';

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      form.reset();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-8">
      <h3 className="font-bold text-lg mb-6">Send Us a Message</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input name="name" required type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
              placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" required type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
              placeholder="your@email.com" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea name="message" required rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none text-sm resize-none"
            placeholder="How can we help?" />
        </div>
        <button
          type="submit"
          disabled={status === 'sending' || status === 'sent'}
          className="w-full py-3 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {status === 'sending' ? 'Sending...' : status === 'sent' ? '✓ Message sent!' : 'Send Message'}
        </button>
        {status === 'error' && (
          <p className="text-sm text-red-600 text-center">Something went wrong. Please try again.</p>
        )}
      </form>
    </div>
  );
}
