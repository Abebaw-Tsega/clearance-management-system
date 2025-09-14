import { useState, useEffect } from 'react';
import axios from '../lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ProfileDropdown from '@/components/ProfileDropdown';
import Footer from '@/components/Footer';
import aastuLogo from '../components/assets/AASTU Logo.jpg';
import {
  Users,
  UserPlus,
  Shield,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  Upload,
  Power,
  PowerOff,
  Filter,
} from 'lucide-react';

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

interface RegistrarAdmin {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  general_role: 'admin';
  is_active: number;
}

interface RoleAssignment {
  general_role: string;
  specific_role?: string | null;
}

interface RequestStats {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
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

interface Department {
  department_id: number;
  department_name: string;
}

interface Block {
  block_id: number;
  block_no: string;
}

export default function SuperAdmin() {
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentRegistrarAdmin, setCurrentRegistrarAdmin] = useState<RegistrarAdmin | null>(null);
  const [requestStats, setRequestStats] = useState<RequestStats>({
    totalRequests: 0,
    approvedRequests: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isChangeAdminOpen, setIsChangeAdminOpen] = useState(false);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [selectedStudentForRole, setSelectedStudentForRole] = useState<Student | null>(null);
  const [newRole, setNewRole] = useState('');
  const [recentRequests, setRecentRequests] = useState<ClearanceRequest[]>([]);
  const [newGeneralRole, setNewGeneralRole] = useState('');
  const [newSpecificRole, setNewSpecificRole] = useState('');
  const [studentAdditionalRoles, setStudentAdditionalRoles] = useState<
    Record<string, RoleAssignment[]>
  >({});
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      console.log('Initial data:', { students, departments, blocks });
        console.log('Current state:', {
          studentIdInput,
          selectedStudentForRole,
          newGeneralRole,
          newSpecificRole,
        });
      } [studentIdInput, selectedStudentForRole, newGeneralRole, newSpecificRole, students, departments, blocks];


    // Fetch students
    axios
      .get('/admin/students', {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      .then((res) => {
        console.log('Students fetched:', res.data);
        setStudents(res.data);
      })
      .catch((err) => {
        console.error('Error fetching students:', err);
        setStudents([]);
      });

    // Fetch recent clearance requests
    axios.get('/admin/data')
          .then((res) => setRecentRequests(res.data))
          .catch((err) => {
            console.error('Failed to fetch clearance data:', err);
            if (err.response?.status === 403) {
              alert('You do not have permission to view clearance data.');
            }
            setRecentRequests([]);
          });

    // Fetch registrar admin
    axios
      .get('/admin/registrar-profile', {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      .then((res) => {
        console.log('Registrar admin response:', res.data);
        // Handle array response by taking the first active admin
        const admin = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
        setCurrentRegistrarAdmin(admin);
        setAdminError(null);
      })
      .catch((err) => {
        console.error('Error fetching registrar admin:', err);
        setCurrentRegistrarAdmin(null);
        setAdminError(err.response?.data?.error || 'Failed to fetch registrar admin');
      });

    // Fetch departments
    axios
      .get('/admin/departments', {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      .then((res) => {
        console.log('Departments fetched:', res.data);
        setDepartments(res.data);
      })
      .catch((err) => {
        console.error('Error fetching departments:', err);
        setDepartments([]);
      });

    // Fetch blocks
    axios
      .get('/admin/blocks', {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      .then((res) => {
        console.log('Blocks fetched:', res.data);
        setBlocks(res.data);
      })
      .catch((err) => {
        console.error('Error fetching blocks:', err);
        setBlocks([]);
      });
  }, [user?.token]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status.replace('_', ' ')}</Badge>;
  };

  const handleChangeAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await axios.post(
        '/admin/roles',
        {
          email: newAdmin.email,
          general_role: 'admin',
          password: newAdmin.password,
        },
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );
      console.log('Change admin response:', response.data);
      setCurrentRegistrarAdmin(response.data.user);
      setNewAdmin({ email: '', password: '' });
      setIsChangeAdminOpen(false);
      alert('Registrar admin changed successfully!');
    } catch (err: any) {
      console.error('Error changing registrar admin:', err);
      alert(err.response?.data?.error || 'Failed to change registrar admin');
    }
  };

  const toggleAdminStatus = async () => {
    if (currentRegistrarAdmin) {
      try {
        await axios.put(
          `/admin/roles/${currentRegistrarAdmin.user_id}`,
          {
            is_active: !currentRegistrarAdmin.is_active,
          },
          {
            headers: { Authorization: `Bearer ${user?.token}` },
          }
        );
        setCurrentRegistrarAdmin((prev) =>
          prev ? { ...prev, is_active: prev.is_active ? 0 : 1 } : null
        );
        alert('Admin status updated successfully!');
      } catch (err: any) {
        console.error('Error toggling admin status:', err);
        alert(err.response?.data?.error || 'Failed to toggle admin status');
      }
    }
  };

  const handleImportStudents = async () => {
    if (!csvFile) {
      setImportError('Please select a CSV file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', csvFile);

    try {
      const response = await axios.post('/admin/import-students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user?.token}`,
        },
      });
      console.log('Import students response:', response.data);
      setImportSuccess(response.data.message);
      setImportError(null);
      setCsvFile(null);
      const studentsRes = await axios.get('/admin/students', {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setStudents(studentsRes.data);
    } catch (err: any) {
      console.error('Import students error:', err);
      setImportError(err.response?.data?.error || 'Failed to import students');
      setImportSuccess(null);
    }
  };

  const handleAssignRole = async () => {
    console.log('handleAssignRole called with:', { selectedStudentForRole, newGeneralRole, newSpecificRole });
    if (!selectedStudentForRole || !newGeneralRole) {
      console.log('Validation failed: Missing student or role');
      alert('Please select a student and a role');
      return;
    }
    if ((newGeneralRole === 'department_head' || newGeneralRole === 'dormitory') && !newSpecificRole) {
      console.log('Validation failed: Missing specific role for', newGeneralRole);
      alert('Please select a department or block');
      return;
    }
    const student_id = String(selectedStudentForRole.student_id);
    try {
      const payload = {
        user_id: selectedStudentForRole.student_id,
        general_role: newGeneralRole,
        specific_role: newGeneralRole === 'department_head' || newGeneralRole === 'dormitory' ? newSpecificRole : null,
      };
      console.log('Sending payload to /admin/roles:', payload);
      const response = await axios.post('http://localhost:3000/api/admin/roles', payload, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      console.log('Assign role response:', response.data);

      setStudentAdditionalRoles((prev) => {
        const existing = prev[student_id] || [];
        const roleExists = existing.some(
          (r) =>
            r.general_role === newGeneralRole &&
            r.specific_role === (newGeneralRole === 'department_head' || newGeneralRole === 'dormitory' ? newSpecificRole : null)
        );
        if (roleExists) {
          console.log('Role already exists:', { general_role: newGeneralRole, specific_role: newSpecificRole });
          alert(`Student already has the role: ${newGeneralRole}${newSpecificRole ? ` (${newSpecificRole})` : ''}`);
          return prev;
        }
        return {
          ...prev,
          [student_id]: [
            ...existing,
            {
              general_role: newGeneralRole,
              specific_role: newGeneralRole === 'department_head' || newGeneralRole === 'dormitory' ? newSpecificRole : null,
            },
          ],
        };
      });

      alert(
        `Role (${newGeneralRole}${newSpecificRole ? ` - ${newSpecificRole}` : ''}) assigned to ${selectedStudentForRole.first_name} ${selectedStudentForRole.last_name}`
      );
      setStudentIdInput('');
      setSelectedStudentForRole(null);
      setNewGeneralRole('');
      setNewSpecificRole('');
    } catch (err: any) {
      console.error('Assign role error:', err.response?.data || err.message);
      alert(err.response?.data?.error || 'Failed to assign role. Check console for details.');
    }
  };
  // Filtering logic for students
  const filteredStudents = students.filter(
    (s) =>
      (filterYear === 'all' || String(s.year_of_study) === filterYear) &&
      (filterDepartment === 'all' || s.department_name === filterDepartment) &&
      (filterLevel === 'all' || s.study_level === filterLevel) &&
      (filterStatus === 'all' || s.clearance_status === filterStatus)
  );

  const getOverviewStats = () => {
    return {
      totalStudents: students.length,
      totalRequests: recentRequests.length,
      approvedRequests: recentRequests.filter(r => r.overall_status === 'approved').length,
      pendingRequests: recentRequests.filter(r => r.overall_status === 'pending').length,
      rejectedRequests: recentRequests.filter(r => r.overall_status === 'rejected').length,
      adminName: currentRegistrarAdmin
        ? `${currentRegistrarAdmin.first_name} ${currentRegistrarAdmin.last_name}`
        : 'No Admin Assigned',
      adminStatus: currentRegistrarAdmin?.is_active ? 'Active' : 'Inactive',
    };
  };

  const stats = getOverviewStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img src={aastuLogo} alt="AASTU Logo" className="w-14 h-15 rounded-md" />
              <div>
                <h1 className="text-2xl font-bold text-purple-600">AASTU Clearance System</h1>
                <p className="text-sm text-gray-600">Super Administrator Portal</p>
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
        <aside className="w-64 bg-purple-600 text-white min-h-screen flex flex-col">
          <nav className="p-6 space-y-2">
            <Button
              variant="ghost"
              onClick={() => setActiveTab('overview')}
              className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium h-auto min-h-0 justify-start ${activeTab === 'overview'
                ? 'bg-white text-purple-600 hover:bg-white/90'
                : 'bg-purple-600/20 text-white hover:bg-white/20'
                }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('students')}
              className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium h-auto min-h-0 justify-start ${activeTab === 'students'
                ? 'bg-white text-purple-600 hover:bg-white/90'
                : 'bg-purple-600/20 text-white hover:bg-white/20'
                }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Students
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('accounts')}
              className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium h-auto min-h-0 justify-start ${activeTab === 'accounts'
                ? 'bg-white text-purple-600 hover:bg-white/90'
                : 'bg-purple-600/20 text-white hover:bg-white/20'
                }`}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Account Management
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('admin')}
              className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium h-auto min-h-0 justify-start ${activeTab === 'admin'
                ? 'bg-white text-purple-600 hover:bg-white/90'
                : 'bg-purple-600/20 text-white hover:bg-white/20'
                }`}
            >
              <Shield className="w-4 h-4 mr-2" />
              Registrar Admin
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('import')}
              className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium h-auto min-h-0 justify-start ${activeTab === 'import'
                ? 'bg-white text-purple-600 hover:bg-white/90'
                : 'bg-purple-600/20 text-white hover:bg-white/20'
                }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Students
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">System Overview</h2>
                <p className="text-gray-600">Monitor overall system performance and statistics</p>
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
                        <BarChart3 className="w-6 h-6 text-purple-600" />
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
                        <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Admin Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Registrar Admin</CardTitle>
                  <CardDescription>Currently assigned registrar administrator</CardDescription>
                </CardHeader>
                <CardContent>
                  {adminError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{adminError}</AlertDescription>
                    </Alert>
                  ) : currentRegistrarAdmin ? (
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-8">
                        <div>
                          <p className="text-sm text-gray-600">Admin Name</p>
                          <p className="text-xl font-bold text-gray-900">
                            {currentRegistrarAdmin.first_name} {currentRegistrarAdmin.last_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <Badge
                            className={
                              currentRegistrarAdmin.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {currentRegistrarAdmin.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="text-sm text-gray-900">{currentRegistrarAdmin.email}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No registrar admin assigned.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

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
                    <Filter className="w-5 h-5 text-purple-600" />
                    <span>Filter Students</span>
                  </CardTitle>
                  <CardDescription>
                    Filter students by academic year, department, level, and clearance status
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
                          {departments.map((dept) => (
                            <SelectItem key={dept.department_id} value={dept.department_name}>
                              {dept.department_name}
                            </SelectItem>
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
                        {Array.isArray(filteredStudents) && filteredStudents.length > 0 ? (
                          filteredStudents.map((student) => (
                            <tr key={student.student_id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                {student.first_name} {student.last_name}
                              </td>
                              <td className="p-3">{student.id_no}</td>
                              <td className="p-3">{student.department_name}</td>
                              <td className="p-3">{student.year_of_study}</td>
                              <td className="p-3">{student.study_level}</td>
                              <td className="p-3">{getStatusBadge(student.clearance_status)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-3 text-center text-gray-400">
                              No students found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Account Management</h2>
                  <p className="text-gray-600">Assign roles and manage user accounts system-wide</p>
                </div>
              </div>

              {/* Role Assignment Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Role Assignment</CardTitle>
                  <CardDescription>
                    Assign additional staff roles to existing students in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold mb-4">Assign Role to Student</h4>
                      <div className="space-y-4">
                        <div>
                          <Label>Student ID</Label>
                          <Input
                            value={studentIdInput}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              setStudentIdInput(value);
                              const foundStudent = students.find(
                                (s) => String(s.student_id).toLowerCase() === value.toLowerCase() ||
                                  (s.id_no && s.id_no.toLowerCase() === value.toLowerCase())
                              );
                              console.log('Student search:', { input: value, foundStudent, studentsLength: students.length });
                              setSelectedStudentForRole(foundStudent || null);
                            }}
                            placeholder="Enter student ID (e.g., ETS0192/14)"
                          />
                        </div>

                        {selectedStudentForRole && (
                          <div className="p-3 bg-blue-50 rounded-lg border">
                            <h5 className="font-medium text-blue-800">Selected Student:</h5>
                            <p className="text-sm">
                              {selectedStudentForRole.first_name} {selectedStudentForRole.last_name}
                            </p>
                            <p className="text-xs text-gray-600">ID: {selectedStudentForRole.id_no}</p>
                            <p className="text-xs text-gray-600">
                              Department: {selectedStudentForRole.department_name} - Year:{' '}
                              {selectedStudentForRole.year_of_study}
                            </p>
                          </div>
                        )}

                        <div>
                          <Label>Assign Role</Label>
                          <Select value={newGeneralRole} onValueChange={(value) => {
                            console.log('Selected general role:', value);
                            setNewGeneralRole(value);
                            setNewSpecificRole('');
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="department_head">Department Head</SelectItem>
                              <SelectItem value="dormitory">Dormitory</SelectItem>
                              <SelectItem value="library">Library</SelectItem>
                              <SelectItem value="cafeteria">Cafeteria</SelectItem>
                              <SelectItem value="student_affairs">Student Affairs</SelectItem>
                              <SelectItem value="sports">Sports</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {newGeneralRole === 'department_head' && (
                          <div>
                            <Label>Department</Label>
                            <Select value={newSpecificRole} onValueChange={(value) => {
                              console.log('Selected department:', value);
                              setNewSpecificRole(value);
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                {departments.length > 0 ? (
                                  departments.map((dept) => (
                                    <SelectItem key={dept.department_id} value={dept.department_name}>
                                      {dept.department_name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="text-gray-500">No departments available</div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {newGeneralRole === 'dormitory' && (
                          <div>
                            <Label>Block</Label>
                            <Select value={newSpecificRole} onValueChange={(value) => {
                              console.log('Selected block:', value);
                              setNewSpecificRole(value);
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select block" />
                              </SelectTrigger>
                              <SelectContent>
                                {blocks.length > 0 ? (
                                  blocks.map((block) => (
                                    <SelectItem key={block.block_id} value={block.block_no}>
                                      {block.block_no}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="text-gray-500">No blocks available</div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          disabled={
                            !selectedStudentForRole ||
                            !newGeneralRole ||
                            ((newGeneralRole === 'department_head' || newGeneralRole === 'dormitory') && !newSpecificRole)
                          }
                          onClick={() => {
                            console.log('Button clicked, disabled state:', {
                              hasStudent: !!selectedStudentForRole,
                              hasGeneralRole: !!newGeneralRole,
                              needsSpecificRole: newGeneralRole === 'department_head' || newGeneralRole === 'dormitory',
                              hasSpecificRole: !!newSpecificRole,
                            });
                            handleAssignRole();
                          }}
                        >
                          Assign Role
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-4">
                        Students with Additional Roles ({Object.keys(studentAdditionalRoles).length} students)
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {Object.keys(studentAdditionalRoles).length > 0 ? (
                          students
                            .filter((student) => studentAdditionalRoles[String(student.student_id)])
                            .map((student) => {
                              const additionalRoles = studentAdditionalRoles[String(student.student_id)] || [];
                              return (
                                <div key={student.student_id} className="p-3 border rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium">
                                        {student.first_name} {student.last_name}
                                      </p>
                                      <p className="text-sm text-gray-600">ID: {student.id_no}</p>
                                      <p className="text-xs text-gray-500">{student.department_name}</p>
                                      <div className="mt-1 space-x-1 space-y-1">
                                        <Badge className="bg-green-100 text-green-800">Student</Badge>
                                        {additionalRoles.map((roleAssignment, index) => (
                                          <Badge key={index} className="bg-blue-100 text-blue-800">
                                            {roleAssignment.general_role}
                                            {roleAssignment.specific_role ? ` (${roleAssignment.specific_role})` : ''}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Year: {student.year_of_study}</p>
                                      {additionalRoles.length > 0 && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="mt-1 text-xs"
                                          onClick={async () => {
                                            if (
                                              window.confirm(
                                                `Remove all additional roles for ${student.first_name} ${student.last_name}?`
                                              )
                                            ) {
                                              try {
                                                console.log('Removing roles for user_id:', student.student_id);
                                                await axios.delete(`http://localhost:3000/api/admin/roles/${student.student_id}`, {
                                                  headers: { Authorization: `Bearer ${user?.token}` },
                                                });
                                                setStudentAdditionalRoles((prev) => {
                                                  const updated = { ...prev };
                                                  delete updated[String(student.student_id)];
                                                  return updated;
                                                });
                                                alert('Roles removed successfully');
                                              } catch (err: any) {
                                                console.error('Error removing roles:', err.response?.data || err.message);
                                                alert(err.response?.data?.error || 'Failed to remove roles');
                                              }
                                            }
                                          }}
                                        >
                                          Remove Roles
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            No students with additional roles.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Registrar Admin Management</h2>
                  <p className="text-gray-600">View and manage the current registrar administrator</p>
                </div>
                <Dialog open={isChangeAdminOpen} onOpenChange={setIsChangeAdminOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <Edit className="w-4 h-4 mr-2" />
                      Change Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Registrar Admin</DialogTitle>
                      <DialogDescription>
                        Assign a new user as the registrar administrator
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newAdmin.email}
                          onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Initial Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newAdmin.password}
                          onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter initial password"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button variant="outline" onClick={() => setIsChangeAdminOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleChangeAdmin}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Change Admin
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Current Admin Display */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Registrar Administrator</CardTitle>
                  <CardDescription>
                    Currently assigned registrar administrator details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {adminError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{adminError}</AlertDescription>
                    </Alert>
                  ) : currentRegistrarAdmin ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm text-gray-600">Full Name</Label>
                            <p className="text-lg font-medium">
                              {currentRegistrarAdmin.first_name} {currentRegistrarAdmin.last_name}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm text-gray-600">Email Address</Label>
                            <p className="text-gray-900">{currentRegistrarAdmin.email}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm text-gray-600">Status</Label>
                            <div className="flex items-center space-x-2">
                              <Badge
                                className={
                                  currentRegistrarAdmin.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }
                              >
                                {currentRegistrarAdmin.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-3 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={toggleAdminStatus}
                          className={
                            currentRegistrarAdmin.is_active
                              ? 'text-red-600 border-red-200'
                              : 'text-green-600 border-green-200'
                          }
                        >
                          {currentRegistrarAdmin.is_active ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-2" />
                              Deactivate Admin
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2" />
                              Activate Admin
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Registrar Admin Assigned
                      </h3>
                      <p className="text-gray-600 mb-4">
                        There is currently no registrar administrator assigned to the system.
                      </p>
                      <Button
                        onClick={() => setIsChangeAdminOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign Admin
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Import Students</h2>
                <p className="text-gray-600">Upload a CSV file to import student data</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Upload Student Data</CardTitle>
                  <CardDescription>
                    Upload a CSV file containing student information. The file should include columns:
                    first_name, last_name, email, id_no, department_name, study_level,
                    year_of_study, block_no (optional), room_no (optional).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="csvFile">Select CSV File</Label>
                      <Input
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          setCsvFile(file);
                          setImportError(null);
                          setImportSuccess(null);
                        }}
                      />
                    </div>
                    {importError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{importError}</AlertDescription>
                      </Alert>
                    )}
                    {importSuccess && (
                      <Alert>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertDescription>{importSuccess}</AlertDescription>
                      </Alert>
                    )}
                    <Button
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={handleImportStudents}
                      disabled={!csvFile}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import Students
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}