import { University, Mail, Phone, MapPin } from 'lucide-react';
import aastuLogo from '../components/assets/AASTU Logo.jpg';

export default function Footer() {
  return (
    <footer className="bg-aastu-blue text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* University Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img src={aastuLogo} alt="AASTU Logo" className="w-15 h-14 rounded-md " />
              <div>
                <h3 className="text-lg font-bold">AASTU</h3>
                <p className="text-sm text-white/80">
                  Clearance Management System
                </p>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Addis Ababa Science and Technology University's comprehensive
              digital platform for managing student clearance processes
              efficiently and transparently.
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-aastu-gold">
              Contact Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-aastu-gold" />
                <span className="text-sm text-white/80">
                  Addis Ababa, Ethiopia
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-aastu-gold" />
                <span className="text-sm text-white/80">+251 11 888 0610</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-aastu-gold" />
                <span className="text-sm text-white/80">
                  clearance@aastu.edu.et
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-aastu-gold">
              Quick Links
            </h4>
            <div className="space-y-2">
              <a
                href="ww.aastu.edu.et"
                className="block text-sm text-white/80 hover:text-aastu-gold transition-colors"
              >
                University Website
              </a>
              <a
                href="studentinfo.aastu.edu.et"
                className="block text-sm text-white/80 hover:text-aastu-gold transition-colors"
              >
                Student Portal
              </a>
              <a
                href="#"
                className="block text-sm text-white/80 hover:text-aastu-gold transition-colors"
              >
                Academic Calendar
              </a>
              <a
                href="#"
                className="block text-sm text-white/80 hover:text-aastu-gold transition-colors"
              >
                Help & Support
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 mt-8 pt-6 text-center">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Addis Ababa Science and Technology
            University. All rights reserved.
          </p>
          <p className="text-xs text-white/40 mt-2">
            Clearance Management System v2.0 | Developed for AASTU
          </p>
        </div>
      </div>
    </footer>
  );
}
