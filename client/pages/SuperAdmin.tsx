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
  Download,
  Filter,
  Settings,
  Power,
  PowerOff
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

interface ClearanceRequest {
  id: string;
  type: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  submittedAt: string;
  departments: {
    name: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
  }[];
}

interface RegistrarAdmin {
  id: string;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function SuperAdmin() {
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentRegistrarAdmin, setCurrentRegistrarAdmin] = useState<RegistrarAdmin | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isChangeAdminOpen, setIsChangeAdminOpen] = useState(false);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const [studentIdInput, setStudentIdInput] = useState('');
  const [selectedStudentForRole, setSelectedStudentForRole] = useState<Student | null>(null);
  const [newRole, setNewRole] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [studentAdditionalRoles, setStudentAdditionalRoles] = useState<Record<string, Array<{ role: string, department?: string }>>>({});

  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    department: '',
    password: ''
  });

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    // Fetch students from backend
    axios.get('/admin/students')
      .then((res) => setStudents(res.data))
      .catch(() => setStudents([]));
    // Fetch current registrar admin from backend
    // axios.get('/admin/registrar')
    //   .then((res) => {
    //     setCurrentRegistrarAdmin(res.data || null);
    //   });
  }, []);

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
      pending: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return <Badge className={variants[status as keyof typeof variants]}>{status.replace('_', ' ')}</Badge>;
  };

  const handleChangeAdmin = () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      alert('Please fill in all fields');
      return;
    }

    const newAdminData: RegistrarAdmin = {
      id: `admin_${Date.now()}`,
      name: newAdmin.name,
      email: newAdmin.email,
      department: 'Registrar Office',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setCurrentRegistrarAdmin(newAdminData);
    setNewAdmin({ name: '', email: '', department: '', password: '' });
    setIsChangeAdminOpen(false);
    alert('Registrar admin changed successfully!');
  };

  const toggleAdminStatus = () => {
    if (currentRegistrarAdmin) {
      setCurrentRegistrarAdmin(prev => prev ? {
        ...prev,
        isActive: !prev.isActive
      } : null);
    }
  };

  // Get unique departments for filter dropdown
  const departments = Array.from(new Set(students.map(s => s.department_name))).filter(Boolean);

  // Filtering logic for flat student objects
  const filteredStudents = students.filter(
    s =>
      (filterYear === 'all' || String(s.year_of_study) === filterYear) &&
      (filterDepartment === 'all' || s.department_name === filterDepartment) &&
      (filterLevel === 'all' || s.study_level === filterLevel) &&
      (filterStatus === 'all' || s.clearance_status === filterStatus)
  );

  const getOverviewStats = () => {
    const totalStudents = students.length;
    // If you want to count requests, you need to fetch them separately or add them to Student interface
    const totalRequests = 0;
    const approvedRequests = 0;
    const pendingRequests = 0;
    const rejectedRequests = 0;

    return {
      totalStudents,
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests,
      adminStatus: currentRegistrarAdmin?.isActive ? 'Active' : 'Inactive',
      adminName: currentRegistrarAdmin?.name || 'No Admin Assigned'
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
                        <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
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
                        <p className="text-2xl font-bold text-gray-900">{stats.totalRequests}</p>
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
                        <p className="text-2xl font-bold text-gray-900">{stats.approvedRequests}</p>
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
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-8">
                      <div>
                        <p className="text-sm text-gray-600">Admin Name</p>
                        <p className="text-xl font-bold text-gray-900">{stats.adminName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <Badge className={currentRegistrarAdmin?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {stats.adminStatus}
                        </Badge>
                      </div>
                      {currentRegistrarAdmin && (
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="text-sm text-gray-900">{currentRegistrarAdmin.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
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
                              <td className="p-3">{student.clearance_status}</td>
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
                    Assign additional roles to existing students in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold mb-4">Assign Additional Role to Student</h4>
                      <div className="space-y-4">
                        <div>
                          <Label>Student ID</Label>
                          <Input
                            value={studentIdInput}
                            onChange={(e) => {
                              setStudentIdInput(e.target.value);
                              // Find student by ID
                              const foundStudent = students.find(s => String(s.student_id) === e.target.value);
                              setSelectedStudentForRole(foundStudent || null);
                            }}
                            placeholder="Enter student ID (e.g., ETS0192/14)"
                          />
                        </div>

                        {selectedStudentForRole && (
                          <div className="p-3 bg-blue-50 rounded-lg border">
                            <h5 className="font-medium text-blue-800">Selected Student:</h5>
                            <p className="text-sm">{selectedStudentForRole.first_name} {selectedStudentForRole.last_name}</p>
                            <p className="text-xs text-gray-600">ID: {selectedStudentForRole.id_no}</p>
                            <p className="text-xs text-gray-600">Department: {selectedStudentForRole.department_name} - Year: {selectedStudentForRole.year_of_study}</p>
                          </div>
                        )}

                        <div>
                          <Label>Assign Additional Role</Label>
                          <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select additional role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Registrar Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {newRole === 'staff' && (
                          <div>
                            <Label>Department Assignment</Label>
                            <Select value={newDepartment} onValueChange={setNewDepartment}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="registrar">Registrar Office</SelectItem>
                                <SelectItem value="library">Library</SelectItem>
                                <SelectItem value="cafeteria">Cafeteria</SelectItem>
                                <SelectItem value="student_affairs">Student Affairs</SelectItem>
                                <SelectItem value="sports">Sports Department</SelectItem>
                                <SelectItem value="cs">Computer Science</SelectItem>
                                <SelectItem value="it">Information Technology</SelectItem>
                                <SelectItem value="se">Software Engineering</SelectItem>
                                <SelectItem value="ee">Electrical Engineering</SelectItem>
                                <SelectItem value="me">Mechanical Engineering</SelectItem>
                                <SelectItem value="ce">Civil Engineering</SelectItem>
                                <SelectItem value="che">Chemical Engineering</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          disabled={!selectedStudentForRole || !newRole || (newRole === 'staff' && !newDepartment)}
                          onClick={() => {
                            if (selectedStudentForRole && newRole) {
                              const student_id = String(selectedStudentForRole.student_id);
                              const newRoleAssignment = {
                                role: newRole,
                                department: newRole === 'staff' ? newDepartment : undefined
                              };

                              setStudentAdditionalRoles(prev => {
                                const existing = prev[student_id] || [];
                                // Check if role already exists
                                const roleExists = existing.some(r => r.role === newRole && r.department === newRoleAssignment.department);
                                if (roleExists) {
                                  alert(`Student already has the ${newRole} role${newRole === 'staff' ? ` in ${newDepartment}` : ''}`);
                                  return prev;
                                }
                                return {
                                  ...prev,
                                  [student_id]: [...existing, newRoleAssignment]
                                };
                              });

                              alert(`Additional role "${newRole}" ${newRole === 'staff' ? `in ${newDepartment}` : ''} assigned to ${selectedStudentForRole.first_name} ${selectedStudentForRole.last_name}`);
                              setStudentIdInput('');
                              setSelectedStudentForRole(null);
                              setNewRole('');
                              setNewDepartment('');
                            }
                          }}
                        >
                          Assign Additional Role
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-4">Students with Additional Roles ({Object.keys(studentAdditionalRoles).length} students have additional roles)</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {/* Display students with their current roles */}
                        {students.map(student => {
                          const additionalRoles = studentAdditionalRoles[String(student.student_id)] || [];
                          return (
                            <div key={student.student_id} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{student.first_name} {student.last_name}</p>
                                  <p className="text-sm text-gray-600">ID: {student.id_no}</p>
                                  <p className="text-xs text-gray-500">{student.department_name}</p>
                                  <div className="mt-1 space-x-1 space-y-1">
                                    <Badge className="bg-green-100 text-green-800">Student</Badge>
                                    {additionalRoles.map((roleAssignment, index) => (
                                      <Badge
                                        key={index}
                                        className={`${roleAssignment.role === 'staff'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-red-100 text-red-800'
                                          }`}
                                      >
                                        {roleAssignment.role === 'staff'
                                          ? `Staff (${roleAssignment.department})`
                                          : 'Registrar Admin'
                                        }
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
                                      onClick={() => {
                                        if (window.confirm(`Remove all additional roles for ${student.first_name} ${student.last_name}?`)) {
                                          setStudentAdditionalRoles(prev => {
                                            const updated = { ...prev };
                                            delete updated[String(student.student_id)];
                                            return updated;
                                          });
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
                        })}

                        {/* Display existing staff */}
                        <div className="p-3 border rounded-lg bg-blue-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">Dr. Tsegaye Alemayehu</p>
                              <p className="text-sm text-gray-600">tsegaye.alemayehu@aastu.edu.et</p>
                              <p className="text-xs text-gray-500">Registrar Office</p>
                              <Badge className="mt-1 bg-purple-100 text-purple-800">Super Admin</Badge>
                            </div>
                            <div className="text-right">
                              <Button variant="outline" size="sm" disabled>
                                <Shield className="w-3 h-3 mr-1" />
                                Protected
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 border rounded-lg bg-red-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">Alemayehu Tadesse</p>
                              <p className="text-sm text-gray-600">alemayehu.tadesse@aastu.edu.et</p>
                              <p className="text-xs text-gray-500">Registrar Office</p>
                              <Badge className="mt-1 bg-red-100 text-red-800">Registrar Admin</Badge>
                            </div>
                          </div>
                        </div>
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
                        Replace the current registrar administrator with a new one
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={newAdmin.name}
                          onChange={(e) => setNewAdmin(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newAdmin.email}
                          onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Initial Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newAdmin.password}
                          onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter initial password"
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button variant="outline" onClick={() => setIsChangeAdminOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleChangeAdmin} className="bg-purple-600 hover:bg-purple-700">
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
                  {currentRegistrarAdmin ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm text-gray-600">Full Name</Label>
                            <p className="text-lg font-medium">{currentRegistrarAdmin.name}</p>
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
                              <Badge className={currentRegistrarAdmin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {currentRegistrarAdmin.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm text-gray-600">Account Created</Label>
                            <p className="text-gray-900">{new Date(currentRegistrarAdmin.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-3 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={toggleAdminStatus}
                          className={currentRegistrarAdmin.isActive ? 'text-red-600 border-red-200' : 'text-green-600 border-green-200'}
                        >
                          {currentRegistrarAdmin.isActive ? (
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
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Registrar Admin Assigned</h3>
                      <p className="text-gray-600 mb-4">There is currently no registrar administrator assigned to the system.</p>
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
        </main>
      </div>

      <Footer />

    </div>
  );
}
