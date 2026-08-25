import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MapPin, Phone, Mail, Leaf, Heart, Eye } from 'lucide-react';
import { ContactForm } from './ContactForm';

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-green-900 to-green-700 text-white py-20 px-4">
          <div className="container-base max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-4">🌿</div>
            <h1 className="text-4xl font-bold mb-4">About Kwamboka Poultry Farm</h1>
            <p className="text-xl text-green-100 leading-relaxed">
              A family-run farm in Nairobi bringing you the freshest, healthiest poultry — raised with care, transparency, and a deep respect for nature.
            </p>
          </div>
        </div>

        {/* Our Story */}
        <div className="py-16 px-4 bg-white">
          <div className="container-base max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Kwamboka Poultry Farm was born from a simple belief: that families in Nairobi deserve access to clean, chemical-free chicken and eggs — and should be able to trust exactly where their food comes from.
                </p>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  We started with a small flock and a commitment to organic farming. Today, we raise thousands of free-range birds using natural feed, zero antibiotics, and humane practices — then deliver directly to your door.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Our <strong>Book a Batch</strong> program takes it further: you can reserve chicks from the day they hatch, track their vaccinations and growth, and receive them — or their eggs — when they're ready. Complete farm-to-table transparency.
                </p>
              </div>
              <div className="bg-green-50 rounded-2xl p-8 text-center">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { value: '4,200+', label: 'Happy Customers' },
                    { value: '12,000', label: 'Eggs Weekly' },
                    { value: '0', label: 'Antibiotics Used' },
                    { value: '2 hrs', label: 'Avg Delivery Time' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm">
                      <p className="text-2xl font-bold text-green-800">{stat.value}</p>
                      <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="py-16 px-4 bg-gray-50">
          <div className="container-base max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">What We Stand For</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Leaf className="w-8 h-8 text-green-600" />,
                  title: 'Organic & Natural',
                  desc: 'Our birds eat natural, chemical-free feed. No antibiotics, no growth hormones — ever. What goes into our chickens goes into your family.',
                },
                {
                  icon: <Heart className="w-8 h-8 text-red-500" />,
                  title: 'Humane Farming',
                  desc: 'Free-range living, clean water, and spacious pens. Our birds are healthy and stress-free — because that produces better, tastier food.',
                },
                {
                  icon: <Eye className="w-8 h-8 text-blue-500" />,
                  title: 'Full Transparency',
                  desc: 'Through My Flock, you can track vaccinations, weight milestones, and health events for your reserved batch in real time.',
                },
              ].map((v) => (
                <div key={v.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                  <div className="flex justify-center mb-4">{v.icon}</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="py-16 px-4 bg-white">
          <div className="container-base max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-3 text-center">Get in Touch</h2>
            <p className="text-gray-600 text-center mb-10">Questions, bulk orders, or just want to visit the farm? We'd love to hear from you.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                { icon: <MapPin size={20} className="text-green-600" />, label: 'Location', value: 'Nairobi, Kenya' },
                { icon: <Phone size={20} className="text-green-600" />, label: 'Phone', value: '+254 712 345 678' },
                { icon: <Mail size={20} className="text-green-600" />, label: 'Email', value: 'info@ecokuku.com' },
              ].map((c) => (
                <div key={c.label} className="flex flex-col items-center text-center bg-green-50 rounded-xl p-5">
                  {c.icon}
                  <p className="text-xs text-gray-500 mt-2">{c.label}</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">{c.value as string}</p>
                </div>
              ))}
            </div>

            <ContactForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
