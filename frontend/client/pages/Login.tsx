import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, University } from 'lucide-react';
import axios from '../lib/axios';
import aastuLogo from "../components/assets/AASTU Logo.jpg";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post('/login', { email, password });
      // Store token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify({
        email: response.data.user?.email || email,
        name: response.data.user?.first_name && response.data.user?.last_name
          ? `${response.data.user.first_name} ${response.data.user.last_name}`
          : email.split('@')[0].replace('.', ' '),
        role: response.data.user?.role || response.data.roles?.[0]?.general_role || 'student',
      }));
      // Redirect based on role
      const role = response.data.user?.role || response.data.roles?.[0]?.general_role || 'student';
      if ([
        'department_head',
        'librarian',
        'cafeteria',
        'dormitory',
        'sport',
        'student_affair',
        'registrar'
      ].includes(role)) {
        window.location.href = '/staff';
      } else {
        window.location.href = `/${role}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: request code, 2: enter code & new password
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Step 1: Request reset code
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      await axios.post('/request-password-reset', { email: forgotEmail });
      setForgotSuccess('Reset code sent to your email.');
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Reset password with code
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      await axios.post('/reset-password', {
        email: forgotEmail,
        token: resetCode,
        newPassword,
      });
      setForgotSuccess('Password reset successfully. You can now log in.');
      setShowForgotPassword(false);
      setForgotEmail('');
      setResetCode('');
      setNewPassword('');
      setForgotStep(1);
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-aastu-blue via-primary to-aastu-blue flex items-center justify-center p-4">
      <div className="w-full max-w-md flex items-center justify-center">
        <div />

        {/* Login Form */}
        <div className="w-full max-w-md">
          <Card className="border-white/20 bg-white/95 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 ">
                <img src={aastuLogo} alt="AASTU Logo" className="w-25 h-20 rounded-md mx-auto " />
                <h1 className="text-2xl font-bold text-aastu-blue">AASTU</h1>
              </div>
              <CardTitle className="text-xl font-bold text-aastu-blue">
                {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {showForgotPassword
                  ? 'Enter your email to receive a password reset code'
                  : 'Sign in to your clearance management account'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-11 mb-11">
              {!showForgotPassword ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@aastu.edu.et"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-gray-300 focus:border-aastu-blue focus:ring-aastu-blue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="border-gray-300 focus:border-aastu-blue focus:ring-aastu-blue pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-aastu-blue hover:text-aastu-blue/80"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-aastu-blue hover:bg-aastu-blue/90 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              ) : (
                <div>
                  {forgotStep === 1 ? (
                    <form onSubmit={handleRequestReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">Email Address</Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="your.email@aastu.edu.et"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          className="border-gray-300 focus:border-aastu-blue focus:ring-aastu-blue"
                        />
                      </div>
                      {forgotError && (
                        <Alert variant="destructive">
                          <AlertDescription>{forgotError}</AlertDescription>
                        </Alert>
                      )}
                      {forgotSuccess && (
                        <Alert variant="default">
                          <AlertDescription>{forgotSuccess}</AlertDescription>
                        </Alert>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => { setShowForgotPassword(false); setForgotStep(1); setForgotEmail(''); setForgotError(''); setForgotSuccess(''); }}
                        >
                          Back to Login
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-aastu-blue hover:bg-aastu-blue/90 text-white"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Sending...' : 'Send '}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-code">Reset Code</Label>
                        <Input
                          id="reset-code"
                          type="text"
                          placeholder="Enter code from email"
                          value={resetCode}
                          onChange={e => setResetCode(e.target.value)}
                          required
                          className="border-gray-300 focus:border-aastu-blue focus:ring-aastu-blue"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                          className="border-gray-300 focus:border-aastu-blue focus:ring-aastu-blue"
                        />
                      </div>
                      {forgotError && (
                        <Alert variant="destructive">
                          <AlertDescription>{forgotError}</AlertDescription>
                        </Alert>
                      )}
                      {forgotSuccess && (
                        <Alert variant="default">
                          <AlertDescription>{forgotSuccess}</AlertDescription>
                        </Alert>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => { setShowForgotPassword(false); setForgotStep(1); setForgotEmail(''); setResetCode(''); setNewPassword(''); setForgotError(''); setForgotSuccess(''); }}
                        >
                          Back to Login
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-aastu-blue hover:bg-aastu-blue/90 text-white"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
