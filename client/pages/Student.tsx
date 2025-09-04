import { useState, useEffect } from "react";
import axios from '../lib/axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileDropdown from "@/components/ProfileDropdown";
import Footer from "@/components/Footer";
import {
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  User,
  Send,
  AlertCircle,
  LogOut,
  University,
  History,
} from "lucide-react";
import aastuLogo from "../components/assets/AASTU Logo.jpg";

export default function Student() {
  const [user, setUser] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [systemClearanceType, setSystemClearanceType] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'status' | 'certificate'>('form');

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      // Fetch student profile from backend
      axios.get('/student/profile')
        .then((res) => setStudentProfile(res.data));
    }
    // Fetch clearance schedule from backend
    axios.get('/admin/system')
      .then((res) => {
        setSystemClearanceType(res.data.reason || "");
      });
    // Fetch student's clearance requests
    axios.get('/student/status')
      .then((res) => {
        const departmentNames = [
          { name: 'Department Head', key: 'department_head_status' },
          { name: 'Librarian', key: 'librarian_status' },
          { name: 'Cafeteria', key: 'cafeteria_status' },
          { name: 'Dormitory', key: 'dormitory_status' },
          { name: 'Sport', key: 'sport_status' },
          { name: 'Student Affair', key: 'student_affair_status' },
          { name: 'Registrar', key: 'registrar_status' }
        ];
        const requests = (res.data || []).map(req => ({
          ...req,
          id: req.request_id, // ensure id is set for certificate download
          departments: departmentNames
            .filter(dep => dep.key in req)
            .map(dep => ({
              name: dep.name,
              status: req[dep.key] || 'pending'
            }))
        }));
        setRequests(requests);
      });
  }, []);

  // Only allow one application per schedule
  const hasApplied = requests.some(r => r.type === systemClearanceType);

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    try {
      await axios.post('/student/request', { clearance_type_id: systemClearanceType });
      // Refresh requests
      const res = await axios.get('/student/status');
      setRequests(res.data.requests || []);
      alert("Clearance application submitted successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Certificate download when all approved
  const handleDownloadCertificate = async (requestId: string) => {
    try {
      const res = await axios.get(`/student/certificate/${requestId}`, { responseType: 'blob' });
      if (res.headers['content-type'] !== 'application/pdf') {
        // If not a PDF, try to read error message
        const reader = new FileReader();
        reader.onload = () => {
          alert(reader.result || 'Failed to download certificate');
        };
        reader.readAsText(res.data);
        return;
      }
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AASTU_Clearance_Certificate_${studentProfile?.studentId}_${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      alert('Certificate downloaded successfully!');
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        alert('Certificate error: ' + err.response.data.error);
      } else {
        alert('Failed to download certificate');
      }
    }
  };

  const calculateProgress = (departments: any[] | undefined) => {
    if (!Array.isArray(departments) || departments.length === 0) return 0;
    const approved = departments.filter((d) => d.status === "approved").length;
    return (approved / departments.length) * 100;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <span style={{ color: 'green' }}>✔️</span>;
      case "rejected":
        return <span style={{ color: 'red' }}>❌</span>;
      case "in_progress":
        return <span style={{ color: 'orange' }}>⏳</span>;
      default:
        return <span style={{ color: 'gray' }}>⏺️</span>;
    }
  };

  const getStatusBadge = (status: string | undefined | null) => {
    if (!status) return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>;
    const variants: any = {
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
      pending: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-800 border-gray-200"}>
        {String(status).replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img src={aastuLogo} alt="AASTU Logo" className="w-15 h-1 rounded-md hidden"/>
              <div>
                <h1 className="text-2xl font-bold text-aastu-blue">
                  AASTU Clearance System
                </h1>
                <p className="text-sm text-gray-600">Student Portal</p>
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
        <aside className="w-64 bg-aastu-blue text-white min-h-screen flex flex-col">
          <nav className="p-6 space-y-2">
            <Button
              variant="ghost"
              onClick={() => setActiveTab("form")}
              className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm h-auto min-h-0 justify-start ${activeTab === "form"
                ? "bg-aastu-gold text-aastu-blue hover:bg-aastu-gold/90"
                : "bg-aastu-blue/20 text-white hover:bg-aastu-gold/20 hover:text-aastu-gold"
                }`}
            >
              New Form
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab("status")}
              className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm h-auto min-h-0 justify-start ${activeTab === "status"
                ? "bg-aastu-gold text-aastu-blue hover:bg-aastu-gold/90"
                : "bg-aastu-blue/20 text-white hover:bg-aastu-gold/20 hover:text-aastu-gold"
                }`}
            >
              Status
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab("certificate")}
              className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm h-auto min-h-0 justify-start ${activeTab === "certificate"
                ? "bg-aastu-gold text-aastu-blue hover:bg-aastu-gold/90"
                : "bg-aastu-blue/20 text-white hover:bg-aastu-gold/20 hover:text-aastu-gold"
                }`}
            >
              Certificate
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="w-full">
            {activeTab === "form" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Send className="w-5 h-5 text-aastu-blue" />
                      <span>Apply for Clearance</span>
                    </CardTitle>
                    <CardDescription>
                      Submit your clearance application with one click
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Clearance Type */}
                    <div className="bg-aastu-light-blue/20 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-aastu-blue mb-2">
                        Clearance Type
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Current clearance period set by administration:
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-aastu-gold text-aastu-blue">
                          {systemClearanceType
                            ? systemClearanceType
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())
                            : "General Clearance"}
                        </Badge>
                      </div>
                    </div>

                    {/* System Status Check */}
                    <div className="border-l-4 border-l-green-500 bg-green-50 p-4 rounded">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium text-green-700">
                            System Active
                          </p>
                          <p className="text-sm text-green-600">
                            You can submit your clearance application
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitApplication}
                      className="w-full bg-aastu-blue hover:bg-aastu-blue/90 h-12 text-lg"
                      disabled={isSubmitting || !systemClearanceType || hasApplied}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Apply for Clearance
                        </>
                      )}
                    </Button>

                    {!systemClearanceType && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Clearance system is currently not accepting
                          applications. Please contact the administration.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "status" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-aastu-blue" />
                      <span>Clearance Status</span>
                    </CardTitle>
                    <CardDescription>
                      Track the progress of your clearance requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {requests.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          You haven't submitted any clearance requests yet. Use
                          the "New Form" tab to submit your first request.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-6">
                        {requests.map((request) => {
                          // Exclude Dormitory for PhD students
                          const isPhD = request.study_level === 'phd' || (studentProfile && studentProfile.study_level === 'phd');
                          const filteredDepartments = request.departments.filter(
                            dept => !(isPhD && dept.name.toLowerCase().includes('dormitory'))
                          );
                          const totalDepartments = filteredDepartments.length;
                          const approvedCount = filteredDepartments.filter(
                            (dept) => (dept.status || '').toLowerCase().trim() === "approved"
                          ).length;
                          const progressValue = totalDepartments > 0 ? (approvedCount / totalDepartments) * 100 : 0;
                          const allApproved = approvedCount === totalDepartments && totalDepartments > 0;
                          const overallStatus = allApproved ? "approved" : "pending";
                          return (
                            <Card key={request.id} className="border-l-4 border-l-aastu-blue">
                              <CardHeader className="pb-3">
                                <div className="justify-between items-start">
                                  <div>
                                    <CardTitle className="text-lg">
                                      {request.type}
                                    </CardTitle>
                                    <CardDescription>
                                      Submitted on {formatDate(request.created_at)}
                                    </CardDescription>
                                    <div className="mt-2 text-sm text-gray-700 font-medium flex items-center justify-between w-full">
                                      <span>Progress </span>
                                      <span className="text-xs text-gray-700 font-semibold whitespace-nowrap">{approvedCount}  of {totalDepartments} approved</span>
                                    </div>
                                    <div className="w-full mt-1 flex items-center">
                                      <div style={{ width: '100%' }} className="relative h-3 rounded-full bg-gray-400">
                                        <div
                                          style={{
                                            width: `${progressValue}%`,
                                            background: 'linear-gradient(90deg, #FFD700 0%, #FFC300 100%)',
                                            height: '100%',
                                            borderRadius: 'inherit',
                                            transition: 'width 0.3s',
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between mb-3 w-full">
                                    <h4 className="text-sm font-medium">Department Approvals</h4>
                                    <Badge className={overallStatus === "approved" ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}>
                                      {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {filteredDepartments.map((dept, index) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-sm font-medium">{dept.name}</span>
                                        <div className="flex items-center space-x-1">
                                          {dept.status.toLowerCase().trim() === "approved" && <span style={{ color: 'green' }}>✔️</span>}
                                          {dept.status.toLowerCase().trim() === "rejected" && <span style={{ color: 'red' }}>❌</span>}
                                          {dept.status.toLowerCase().trim() === "pending" && <span style={{ color: 'gray' }}>⏺️</span>}
                                          <span className="text-xs capitalize">{dept.status}</span>
                                        </div>
                                        {dept.status.toLowerCase().trim() === "rejected" && dept.comment && (
                                          <div className="text-xs text-red-600 ml-2">Comment: {dept.comment}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "certificate" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-aastu-blue" />
                      <span>Clearance Certificate</span>
                    </CardTitle>
                    <CardDescription>
                      Download your official clearance certificate once all
                      departments have approved your request
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Only show certificate if all departments and registrar are approved (robust check)
                      return requests
                        .filter((request) => {
                          const isPhD = request.study_level === 'phd' || (studentProfile && studentProfile.study_level === 'phd');
                          const filteredDepartments = request.departments.filter(
                            dept => !(isPhD && dept.name.toLowerCase().includes('dormitory'))
                          );
                          const allApproved = filteredDepartments.length > 0 && filteredDepartments.every(
                            (dept) => (dept.status || '').toLowerCase().trim() === "approved"
                          );
                          return allApproved && (request.registrar_status || '').toLowerCase().trim() === "approved";
                        })
                        .map((request) => (
                          <Card key={request.id} className="border-l-4 border-l-green-500">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg text-green-800">
                                    {request.type}
                                  </CardTitle>
                                  <CardDescription>
                                    Approved on {new Date(request.submittedAt).toLocaleDateString()}
                                  </CardDescription>
                                </div>
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  Fully Approved
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {/* Department Approvals */}
                                <div>
                                  <Label className="text-sm font-medium text-gray-700">
                                    Department Approvals
                                  </Label>
                                  <div className="grid grid-cols-1 gap-2 mt-2">
                                    {request.departments.filter(
                                      dept => !(request.study_level === 'phd' || (studentProfile && studentProfile.study_level === 'phd')) || !dept.name.toLowerCase().includes('dormitory')
                                    ).map((dept, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200"
                                      >
                                        <span className="text-sm font-medium text-green-800">
                                          {dept.name}
                                        </span>
                                        <div className="flex items-center space-x-1">
                                          <CheckCircle className="w-4 h-4 text-green-500" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* Certificate Actions */}
                                <div className="border-t pt-4">
                                  <div className="flex space-x-3">
                                    <Button
                                      className="bg-aastu-blue hover:bg-aastu-blue/90 flex-1"
                                      onClick={async () => {
                                        if (!request.id) {
                                          alert("Certificate request ID is missing!");
                                          return;
                                        }
                                        try {
                                          const res = await axios.get(
                                            `/student/certificate/${request.id}`,
                                            {
                                              responseType: 'blob',
                                              headers: {
                                                Authorization: `Bearer ${localStorage.getItem("token")}`,
                                              },
                                            }
                                          );
                                          const url = window.URL.createObjectURL(res.data);
                                          const a = document.createElement("a");
                                          a.href = url;
                                          a.download = `AASTU_Clearance_Certificate_${studentProfile?.studentId}_${Date.now()}.pdf`;
                                          a.click();
                                          window.URL.revokeObjectURL(url);
                                          alert("Certificate downloaded successfully!");
                                        } catch (err) {
                                          alert("Failed to download certificate");
                                        }
                                      }}
                                    >
                                      <FileText className="w-4 h-4 mr-2" />
                                      Download Certificate
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        alert(
                                          "Certificate verification feature will be available soon. Your certificate ID: " +
                                          request.id
                                        );
                                      }}
                                    >
                                      Verify Certificate
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ));
                    })()}
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
