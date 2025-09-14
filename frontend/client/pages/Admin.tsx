import { useEffect, useState } from "react";
import axios from "../lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ProfileDropdown from '@/components/ProfileDropdown';
import {
  Settings,
  Users,
  UserPlus,
  User,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Power,
  PowerOff,
  LogOut,
  Clock,
  BarChart3,
  Filter,
  Upload // New icon for import
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Footer from '@/components/Footer';
import aastuLogo from "../components/assets/AASTU Logo.jpg";

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  id_no: string;
  department_name: string;
  year_of_study: number;
  study_level: string;
  clearance_status: string;
}

interface ClearanceRequest {
  request_id: string;
  type_name: string;
  overall_status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  created_at: string;
  first_name: string;
  last_name: string;
  department_name: string;
  year_of_study: number;
}

export default function Admin() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'system' | 'import'>('overview');
  const [systemStatus, setSystemStatus] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [systemReason, setSystemReason] = useState('');
  const [systemEndTime, setSystemEndTime] = useState('');
  const [systemEndDate, setSystemEndDate] = useState('');
  const [systemStartTime, setSystemStartTime] = useState('');
  const [systemStartDate, setSystemStartDate] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [clearanceTypes, setClearanceTypes] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<ClearanceRequest[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ message: string; errors: string[] | null } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    axios.get('/admin/students')
      .then((res) => setStudents(res.data))
      .catch((err) => {
        console.error('Failed to fetch students:', err);
        if (err.response?.status === 403) {
          alert('You do not have permission to view students.');
        }
        setStudents([]);
      });
    axios.get('/admin/clearance-types')
      .then((res) => setClearanceTypes(res.data))
      .catch((err) => {
        console.error('Failed to fetch clearance types:', err);
        setClearanceTypes([]);
      });
    axios.get('/admin/data')
      .then((res) => setRecentRequests(res.data))
      .catch((err) => {
        console.error('Failed to fetch clearance data:', err);
        if (err.response?.status === 403) {
          alert('You do not have permission to view clearance data.');
        }
        setRecentRequests([]);
      });
    axios.get('/admin/system')
      .then(res => {
        setSystemStatus(!!res.data.is_active);
        setSystemReason(res.data.reason || '');
        setSystemStartDate(res.data.startDate || '');
        setSystemStartTime(res.data.startTime || '');
        setSystemEndDate(res.data.endDate || '');
        setSystemEndTime(res.data.endTime || '');
      })
      .catch((err) => {
        console.error('Failed to fetch system status:', err);
        setSystemStatus(false);
      });
  }, []);

  // Get unique departments for filter dropdown
  const departments = Array.from(new Set(students.map(s => s.department_name))).filter(Boolean);

  // Filtering logic for students
  const filteredStudents = students.filter(
    s =>
      (filterYear === 'all' || String(s.year_of_study) === filterYear) &&
      (filterDepartment === 'all' || s.department_name === filterDepartment) &&
      (filterLevel === 'all' || s.study_level === filterLevel) &&
      (filterStatus === 'all' || s.clearance_status === filterStatus)
  );

  // Countdown timer and auto-off effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (systemStatus && systemEndDate && systemEndTime) {
        const endDateTime = new Date(`${systemEndDate}T${systemEndTime}`);
        const now = new Date();
        const timeDiff = endDateTime.getTime() - now.getTime();
        if (timeDiff <= 0) {
          setSystemStatus(false);
          axios.put('/admin/system-control', {
            reason: systemReason,
            startDate: systemStartDate,
            startTime: systemStartTime,
            endDate: systemEndDate,
            endTime: systemEndTime,
            is_active: false,
            clearance_type_id: clearanceTypes.find(type => type.type_name === systemReason)?.clearance_type_id || '',
          })
            .catch((err) => console.error('Failed to deactivate system:', err));
          setSystemReason('');
          setSystemEndTime('');
          setSystemEndDate('');
          setSystemStartDate('');
          setSystemStartTime('');
          setTimeRemaining('');
          alert('System automatically turned OFF - scheduled time expired');
        } else {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
          setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
      } else {
        setTimeRemaining('');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [systemStatus, systemEndDate, systemEndTime, systemReason, systemStartDate, systemStartTime, clearanceTypes]);

  const getOverviewStats = () => {
    const totalStudents = students.length;
    const totalRequests = recentRequests.length;
    const approvedRequests = recentRequests.filter(r => r.overall_status === 'approved').length;
    const pendingRequests = recentRequests.filter(r => r.overall_status === 'pending').length;
    const rejectedRequests = recentRequests.filter(r => r.overall_status === 'rejected').length;
    return {
      totalStudents,
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests
    };
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status.replace('_', ' ')}</Badge>;
  };

  const handleSystemToggle = async (newStatus: boolean) => {
    if (newStatus) {
      if (!systemReason || !systemStartDate || !systemStartTime || !systemEndDate || !systemEndTime) {
        alert('Please provide a reason, start date/time, and end date/time before activating the system.');
        return;
      }
      const startDateTime = new Date(`${systemStartDate}T${systemStartTime}`);
      const endDateTime = new Date(`${systemEndDate}T${systemEndTime}`);
      const now = new Date();
      if (startDateTime < now) {
        alert('Start date/time must be in the present or future.');
        return;
      }
      if (endDateTime <= startDateTime) {
        alert('End date/time must be after start date/time.');
        return;
      }
      try {
        await axios.put('/admin/system-control', {
          reason: systemReason,
          startDate: systemStartDate,
          startTime: systemStartTime,
          endDate: systemEndDate,
          endTime: systemEndTime,
          is_active: true,
          clearance_type_id: clearanceTypes.find(type => type.type_name === systemReason)?.clearance_type_id || '',
        });
        setSystemStatus(true);
        alert(`System activated for ${systemReason.replace(/_/g, ' ')}. Will automatically turn off on ${endDateTime.toLocaleString()}`);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to activate system');
      }
    } else {
      try {
        await axios.put('/admin/system-control', {
          reason: systemReason,
          startDate: systemStartDate,
          startTime: systemStartTime,
          endDate: systemEndDate,
          endTime: systemEndTime,
          is_active: false,
          clearance_type_id: clearanceTypes.find(type => type.type_name === systemReason)?.clearance_type_id || '',
        });
        setSystemStatus(false);
        setSystemReason('');
        setSystemEndTime('');
        setSystemEndDate('');
        setSystemStartTime('');
        setSystemStartDate('');
        alert('System manually deactivated! Student submissions are temporarily disabled.');
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to deactivate system');
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!csvFile) {
      alert('Please select a CSV file to import.');
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('csvFile', csvFile);

    try {
      const response = await axios.post('/admin/import-students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(response.data);
      // Refresh students list
      const studentsResponse = await axios.get('/admin/students');
      setStudents(studentsResponse.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to import students');
      setImportResult({ message: 'Import failed', errors: [err.response?.data?.error || 'Server error'] });
    } finally {
      setIsImporting(false);
      setCsvFile(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img src={aastuLogo} alt="AASTU Logo" className="w-20 h-14 text-aastu-blue" />
              <div>
                <h1 className="text-2xl font-bold text-aastu-blue">AASTU Clearance System</h1>
                <p className="text-sm text-gray-600">Registrar Portal</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && <ProfileDropdown user={user} />}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-aastu-blue text-white min-h-screen">
          <nav className="p-6 space-y-2">
            <Button
              variant="ghost"
              onClick={() => setActiveTab('overview')}
              className={`w-full rounded-lg px-3 py-3 text-sm font-medium h-12 justify-start ${activeTab === 'overview'
                ? 'bg-aastu-gold text-aastu-blue hover:bg-aastu-gold/90'
                : 'bg-transparent text-white hover:bg-white/10 hover:text-white'
                }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('students')}
              className={`w-full rounded-lg px-3 py-3 text-sm font-medium h-12 justify-start ${activeTab === 'students'
                ? 'bg-aastu-gold text-aastu-blue hover:bg-aastu-gold/90'
                : 'bg-transparent text-white hover:bg-white/10 hover:text-white'
                }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Students
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('system')}
              className={`w-full rounded-lg px-3 py-3 text-sm font-medium h-12 justify-start ${activeTab === 'system'
                ? 'bg-aastu-gold text-aastu-blue hover:bg-aastu-gold/90'
                : 'bg-transparent text-white hover:bg-white/10 hover:text-white'
                }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              System Control
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('import')}
              className={`w-full rounded-lg px-3 py-3 text-sm font-medium h-12 justify-start ${activeTab === 'import'
                ? 'bg-aastu-gold text-aastu-blue hover:bg-aastu-gold/90'
                : 'bg-transparent text-white hover:bg-white/10 hover:text-white'
                }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="w-full">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">System Overview</h2>
                  <p className="text-gray-600">Monitor student clearance requests and system performance</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-gray-600">Total Students</p>
                          <p className="text-2xl font-bold text-gray-900">{getOverviewStats().totalStudents}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Settings className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-gray-600">Total Requests</p>
                          <p className="text-2xl font-bold text-gray-900">{getOverviewStats().totalRequests}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-gray-600">Approved</p>
                          <p className="text-2xl font-bold text-gray-900">{getOverviewStats().approvedRequests}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-gray-600">Pending</p>
                          <p className="text-2xl font-bold text-gray-900">{getOverviewStats().pendingRequests}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Student Clearance Requests Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Student Clearance Requests</CardTitle>
                    <CardDescription>Latest clearance requests from students</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">Student</th>
                            <th className="text-left p-3">Department</th>
                            <th className="text-left p-3">Year</th>
                              <th className="text-left p-3">Request Type</th>
                              <th className="text-left p-3">Status</th>
                              <th className="text-left p-3">Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(recentRequests) && recentRequests.length > 0 ? (
                            recentRequests.map(request => (
                              <tr key={request.request_id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{request.first_name} {request.last_name}</td>
                                <td className="p-3">{request.department_name || '-'}</td>
                                <td className="p-3">{request.year_of_study || '-'}</td>
                                <td className="p-3">{request.type_name || '-'}</td>
                                <td className="p-3">{request.overall_status ? getStatusBadge(request.overall_status) : '-'}</td>
                                <td className="p-3">{request.created_at ? new Date(request.created_at).toLocaleDateString() : '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-3 text-center text-gray-400">No recent requests found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Students Management Tab */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Student Management</h2>
                    <p className="text-gray-600">View and filter student clearance requests</p>
                  </div>
                </div>

                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Filter className="w-5 h-5 text-aastu-blue" />
                      <span>Filter Students</span>
                    </CardTitle>
                    <CardDescription>
                      Filter students by academic year, department, and clearance status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm">Academic Year</Label>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            <SelectItem value="1">1st Year</SelectItem>
                            <SelectItem value="2">2nd Year</SelectItem>
                            <SelectItem value="3">3rd Year</SelectItem>
                            <SelectItem value="4">4th Year</SelectItem>
                            <SelectItem value="5">5th Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Department</Label>
                        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map(dept => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Level of Study</Label>
                        <Select value={filterLevel} onValueChange={setFilterLevel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="undergraduate">Undergraduate</SelectItem>
                            <SelectItem value="masters">Masters</SelectItem>
                            <SelectItem value="phd">PhD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Clearance Status</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Students Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Students Overview</CardTitle>
                    <CardDescription>
                      Showing {filteredStudents.length} of {students.length} students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border">
                        <thead>
                          <tr>
                            <th className="text-left p-3">Name</th>
                            <th className="text-left p-3">ID No</th>
                            <th className="text-left p-3">Department</th>
                            <th className="text-left p-3">Year</th>
                            <th className="text-left p-3">Level</th>
                            <th className="text-left p-3">Clearance Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(filteredStudents) && filteredStudents.length > 0) ? (
                            filteredStudents.map(student => (
                              <tr key={student.student_id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{student.first_name} {student.last_name}</td>
                                <td className="p-3">{student.id_no}</td>
                                <td className="p-3">{student.department_name}</td>
                                <td className="p-3">{student.year_of_study}</td>
                                <td className="p-3">{student.study_level}</td>
                                <td className="p-3">{getStatusBadge(student.clearance_status)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-3 text-center text-gray-400">No students found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* System Control Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-aastu-blue" />
                      <span>System Control Panel</span>
                    </CardTitle>
                    <CardDescription>
                      Control system-wide settings and student submission access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-aastu-blue">System Configuration</h4>
                        <div className="space-y-2">
                          <Label htmlFor="reason">Reason for Activation</Label>
                          <Select value={systemReason} onValueChange={setSystemReason} disabled={systemStatus}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason for system activation" />
                            </SelectTrigger>
                            <SelectContent>
                              {clearanceTypes.map(type => (
                                <SelectItem key={type.clearance_type_id} value={type.type_name}>
                                  {type.type_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                              id="startDate"
                              type="date"
                              value={systemStartDate}
                              onChange={(e) => setSystemStartDate(e.target.value)}
                              disabled={systemStatus}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input
                              id="startTime"
                              type="time"
                              value={systemStartTime}
                              onChange={(e) => setSystemStartTime(e.target.value)}
                              disabled={systemStatus}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input
                              id="endDate"
                              type="date"
                              value={systemEndDate}
                              onChange={(e) => setSystemEndDate(e.target.value)}
                              disabled={systemStatus}
                              min={systemStartDate || new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endTime">End Time</Label>
                            <Input
                              id="endTime"
                              type="time"
                              value={systemEndTime}
                              onChange={(e) => setSystemEndTime(e.target.value)}
                              disabled={systemStatus}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-aastu-blue">System Status</h4>
                        <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                {systemStatus ? (
                                  <Power className="w-8 h-8 text-green-500" />
                                ) : (
                                  <PowerOff className="w-8 h-8 text-red-500" />
                                )}
                                <div>
                                  <h3 className="text-xl font-semibold">
                                    Student Clearance System
                                  </h3>
                                  <p className="text-gray-600">
                                    {systemStatus
                                      ? 'Students can submit one clearance form per schedule'
                                      : 'Student submissions are currently disabled'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Label htmlFor="system-toggle" className="text-lg font-medium">
                                {systemStatus ? 'ON' : 'OFF'}
                              </Label>
                              <Switch
                                id="system-toggle"
                                checked={systemStatus}
                                onCheckedChange={handleSystemToggle}
                                className="data-[state=checked]:bg-green-500"
                              />
                            </div>
                          </div>
                        </div>
                        {timeRemaining && systemStatus && (
                          <Alert className="border-yellow-200 bg-yellow-50">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-700">
                              <strong>Time Remaining:</strong> {timeRemaining}
                              <br />
                              <strong>Reason:</strong> {systemReason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              <br />
                              System will automatically turn OFF on {systemEndDate} at {systemEndTime}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                    <Alert className={systemStatus ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}>
                      {systemStatus ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription>
                        <strong>System Status:</strong> {systemStatus ? 'Active' : 'Inactive'}
                        <br />
                        {systemStatus
                          ? 'Students can submit one clearance form per schedule. Staff can process existing requests.'
                          : 'New clearance form submissions are disabled. Existing requests can still be processed by staff.'}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Import Tab */}
            {activeTab === 'import' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Import Students</h2>
                  <p className="text-gray-600">Upload a CSV file to import student data into the system</p>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Upload className="w-5 h-5 text-aastu-blue" />
                      <span>CSV Import</span>
                    </CardTitle>
                    <CardDescription>
                      Upload a CSV file containing student information. Required columns: first_name, last_name, email, id_no, department_name, study_level, year_of_study. Optional: block_no, room_no.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="csvFile">Select CSV File</Label>
                      <Input
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                      />
                    </div>
                    <Button
                      onClick={handleImport}
                      disabled={!csvFile || isImporting}
                      className="bg-aastu-blue text-white hover:bg-aastu-blue/90"
                    >
                      {isImporting ? 'Importing...' : 'Import Students'}
                    </Button>
                    {importResult && (
                      <Alert
                        className={
                          importResult.errors
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-green-200 bg-green-50 text-green-700'
                        }
                      >
                        {importResult.errors ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        <AlertDescription>
                          <strong>{importResult.message}</strong>
                          {importResult.errors && (
                            <ul className="list-disc pl-4 mt-2">
                              {importResult.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}