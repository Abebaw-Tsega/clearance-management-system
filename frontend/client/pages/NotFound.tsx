import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  const user = localStorage.getItem('user');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-aastu-blue via-primary to-aastu-blue flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4">
            <AlertTriangle className="w-16 h-16 text-aastu-gold mx-auto mb-2" />
          </div>
          <CardTitle className="text-3xl font-bold text-aastu-blue">404</CardTitle>
          <CardDescription className="text-lg">
            Page Not Found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
          
          <div className="space-y-2">
            {user ? (
              <Button asChild className="w-full bg-aastu-blue hover:bg-aastu-blue/90">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild className="w-full bg-aastu-blue hover:bg-aastu-blue/90">
                <Link to="/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Go to Login
                </Link>
              </Button>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-aastu-light-blue/20 rounded-lg">
            <p className="text-sm text-aastu-blue">
              <strong>AASTU Clearance Management System</strong>
              <br />
              If you believe this is an error, please contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
