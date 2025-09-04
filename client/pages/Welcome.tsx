import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Footer from "@/components/Footer";
import {
  University,
  BookOpen,
  Award,
  Users,
  Globe,
  CheckCircle,
  ArrowRight,
  Target,
  Microscope,
} from "lucide-react";
import aastuLogo from "../components/assets/AASTU Logo.jpg";

export default function Welcome() {
  const handleLoginRedirect = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-aastu-blue via-primary to-aastu-blue flex flex-col">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src={aastuLogo} alt="AASTU Logo" className="w-20 h-14 rounded-md" />
              <div>
                <h1 className="text-2xl font-bold text-aastu-blue">
                  AASTU Clearance System
                </h1>
                <p className="text-sm text-gray-600">
                  Addis Ababa Science and Technology University
                </p>
              </div>
            </div>
            <Button
              onClick={handleLoginRedirect}
              className="bg-aastu-blue hover:bg-aastu-blue/90 text-white px-6 py-2"
            >
              Login to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 flex-1">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">
            Welcome to AASTU
            <span className="block text-aastu-gold">
              Clearance Management System
            </span>
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Streamline your clearance process with our comprehensive digital
            platform. Designed for students, staff, and administrators to manage
            clearance requests efficiently and transparently.
          </p>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-aastu-blue mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-gray-600 mb-6">
                Access your personalized dashboard to manage clearance requests,
                track progress, and stay updated with the latest notifications.
              </p>
              <Button
                onClick={handleLoginRedirect}
                className="bg-aastu-blue hover:bg-aastu-blue/90 text-white px-8 py-3 text-lg"
                size="lg"
              >
                Access Your Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* University Statistics Section */}
      <section className="bg-white/10 backdrop-blur-sm py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              AASTU at a Glance
            </h3>
            <p className="text-white/80 text-lg">
              Established in 2011 as Ethiopia's leading science and technology
              university
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold text-aastu-gold mb-2">97</div>
              <div className="text-white/80">Total Academic Programs</div>
              <div className="text-xs text-white/60 mt-1">
                (13 UG + 43 MSc + 41 PhD)
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-aastu-gold mb-2">
                175+
              </div>
              <div className="text-white/80">International Partners</div>
              <div className="text-xs text-white/60 mt-1">
                Global collaboration network
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-aastu-gold mb-2">127</div>
              <div className="text-white/80">National Partners</div>
              <div className="text-xs text-white/60 mt-1">
                Local industry connections
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
