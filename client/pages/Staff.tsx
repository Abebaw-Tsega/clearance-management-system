import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProfileDropdown from "@/components/ProfileDropdown";
import Footer from "@/components/Footer";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  Search,
  Filter,
  AlertCircle,
  Edit,
} from "lucide-react";
import axios from "../lib/axios";
import aastuLogo from "../components/assets/AASTU Logo.jpg";
import { styleText } from "util";


export default function Staff() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [comments, setComments] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "change" | null
  >(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    // Fetch pending requests from backend
    axios
      .get("/staff/requests")
      .then((res) => {
        setRequests(res.data || []);
      })
      .catch(() => {
        setRequests([]);
      });
  }, []);

  useEffect(() => {
    let filtered = requests;
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.studentId?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    setFilteredRequests(filtered);
  }, [searchTerm, statusFilter, requests]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await axios.put(
        `/staff/requests/${selectedRequest.request_id}/action`,
        { status: "approved", comments },
      );
      alert("Request approved successfully!");
      // Refresh requests
      const res = await axios.get("/staff/requests");
      setRequests(res.data || []);
      setSelectedRequest(null);
      setComments("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await axios.put(
        `/staff/requests/${selectedRequest.request_id}/action`,
        { status: "rejected", comments },
      );
      alert("Request rejected successfully!");
      // Refresh requests
      const res = await axios.get("/staff/requests");
      setRequests(res.data || []);
      setSelectedRequest(null);
      setComments("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeDecision = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      let newStatus = null;
      if (actionType === "approve") {
        await axios.put(`/staff/requests/${selectedRequest.request_id}/action`, { status: "approved", comments });
        newStatus = "approved";
        alert("Request changed to approved!");
      } else if (actionType === "reject") {
        if (!comments.trim()) {
          alert("Please provide a reason for rejection.");
          setIsProcessing(false);
          return;
        }
        await axios.put(`/staff/requests/${selectedRequest.request_id}/action`, { status: "rejected", comments });
        newStatus = "rejected";
        alert("Request changed to rejected!");
      }
      // Refresh requests and close dialog
      const res = await axios.get("/staff/requests");
      setRequests(res.data || []);
      setSelectedRequest(null);
      setComments("");
      setActionType(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };

    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    );
  };

  const getClearanceTypeLabel = (type: string) => {
    const labels = {
      graduation: "Graduation Clearance",
      withdrawal: "Student Withdrawal",
      transfer: "Transfer Clearance",
      semester: "Semester End Clearance",
      leave: "Leave of Absence",
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img src={aastuLogo} alt="AASTU Logo" className="w-20 h-14.5 rounded-md" />
              <div>
                <h1 className="text-2xl font-bold text-aastu-blue">
                  AASTU Clearance System
                </h1>
                <p className="text-sm text-gray-600">Staff Portal</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && <ProfileDropdown user={user} />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 flex-1">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900">Pending</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {requests.filter((r) => r.status === "pending").length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-900">Approved</h3>
                <p className="text-2xl font-bold text-green-600">
                  {requests.filter((r) => r.status === "approved").length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <h3 className="font-semibold text-red-900">Rejected</h3>
                <p className="text-2xl font-bold text-red-600">
                  {requests.filter((r) => r.status === "rejected").length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Total</h3>
                <p className="text-2xl font-bold text-gray-600">
                  {requests.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-aastu-blue" />
                <span>Student Clearance Requests</span>
              </CardTitle>
              <CardDescription>
                Review and process student clearance requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by student name, email, ID, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aastu-blue focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Requests Table */}
              {filteredRequests.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No clearance requests found matching your criteria.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Year Level</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.request_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.first_name} {request.last_name}</p>
                            <p className="text-xs text-gray-500">{request.id_no}</p>
                          </div>
                        </TableCell>
                        <TableCell>{request.department}</TableCell>
                        <TableCell>{getClearanceTypeLabel(request.clearance_type)}</TableCell>
                        <TableCell>{request.year_of_study ? `${request.year_of_study} Year` : '-'}</TableCell>
                        <TableCell>{request.created_at ? new Date(request.created_at).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setComments(request.comments || "");
                                  setActionType(null);
                                }}
                                className="border-aastu-blue text-aastu-blue hover:bg-aastu-blue hover:text-white"
                              >
                                {request.status === "pending" ? (
                                  <>
                                    <Eye className="w-4 h-4 mr-1" />
                                    Review
                                  </>
                                ) : (
                                  <>
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  {selectedRequest && selectedRequest.status === "pending"
                                    ? "Review Clearance Request"
                                    : "Update Clearance Decision"}
                                </DialogTitle>
                                <DialogDescription>
                                  {selectedRequest
                                    ? selectedRequest.status === "pending"
                                      ? `Review and process ${selectedRequest.first_name} ${selectedRequest.last_name}'s clearance request`
                                      : `Update decision for ${selectedRequest.first_name} ${selectedRequest.last_name}'s clearance request`
                                    : ""}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedRequest && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <Label className="font-medium">Student Name</Label>
                                      <p>{selectedRequest.first_name} {selectedRequest.last_name}</p>
                                      <p className="text-gray-600">{selectedRequest.email}</p>
                                    </div>
                                    <div>
                                      <Label className="font-medium">ID No</Label>
                                      <p>{selectedRequest.id_no}</p>
                                    </div>
                                    <div>
                                      <Label className="font-medium">Department</Label>
                                      <p>{selectedRequest.department}</p>
                                    </div>
                                    <div>
                                      <Label className="font-medium">Study Level</Label>
                                      <p>{selectedRequest.study_level}</p>
                                    </div>
                                    <div>
                                      <Label className="font-medium">Clearance Type</Label>
                                      <p>{getClearanceTypeLabel(selectedRequest.clearance_type)}</p>
                                    </div>
                                    <div>
                                      <Label className="font-medium">Submitted Date</Label>
                                      <p>{selectedRequest.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleDateString() : ''}</p>
                                    </div>
                                    <div>
                                      <Label className="font-medium">Reason</Label>
                                      <p>{selectedRequest.reason}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="font-medium">Comments</Label>
                                    <p className="mt-1 p-3 bg-gray-50 rounded text-sm">{selectedRequest.comments}</p>
                                  </div>

                                  {selectedRequest.status !== "pending" && (
                                    <div>
                                      <Label className="font-medium">
                                        Current Status
                                      </Label>
                                      <div className="mt-1">
                                        {getStatusBadge(selectedRequest.status)}
                                      </div>
                                    </div>
                                  )}

                                  {selectedRequest.staffComments && (
                                    <div>
                                      <Label className="font-medium">
                                        Previous Comments
                                      </Label>
                                      <p className="mt-1 p-3 bg-gray-50 rounded text-sm">
                                        {selectedRequest.staffComments}
                                      </p>
                                    </div>
                                  )}

                                  <div className="space-y-3">
                                    {(selectedRequest.status === "pending" ||
                                      actionType === "reject") && (
                                        <div>
                                          <Label htmlFor="comments">
                                            Comments/Feedback (Required for
                                            rejection)
                                          </Label>
                                          <Textarea
                                            id="comments"
                                            placeholder="Add your comments or feedback for this request..."
                                            value={comments}
                                            onChange={(e) =>
                                              setComments(e.target.value)
                                            }
                                            className="mt-1"
                                          />
                                        </div>
                                      )}

                                    {selectedRequest.status === "pending" ? (
                                      <div className="flex space-x-3">
                                        <Button
                                          onClick={() => {
                                            setActionType("approve");
                                            handleApprove();
                                          }}
                                          disabled={isProcessing}
                                          className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          {isProcessing
                                            ? "Processing..."
                                            : "Approve"}
                                        </Button>
                                        <Button
                                          onClick={() => {
                                            setActionType("reject");
                                            if (!comments.trim()) {
                                              alert(
                                                "Please provide a reason for rejection.",
                                              );
                                              return;
                                            }
                                            handleReject();
                                          }}
                                          disabled={isProcessing}
                                          variant="destructive"
                                          className="flex-1"
                                        >
                                          <XCircle className="w-4 h-4 mr-2" />
                                          {isProcessing
                                            ? "Processing..."
                                            : "Reject"}
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex space-x-3">
                                        {selectedRequest.status ===
                                          "approved" ? (
                                          <Button
                                            onClick={() => {
                                              setActionType("reject");
                                            }}
                                            disabled={isProcessing}
                                            variant="destructive"
                                            className="flex-1"
                                          >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            {isProcessing
                                              ? "Processing..."
                                              : "Change to Reject"}
                                          </Button>
                                        ) : (
                                          <Button
                                            onClick={() => {
                                              setActionType("approve");
                                              handleChangeDecision();
                                            }}
                                            disabled={isProcessing}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                          >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            {isProcessing
                                              ? "Processing..."
                                              : "Change to Approve"}
                                          </Button>
                                        )}
                                        {/* When changing to reject, show comment textarea and confirm button */}
                                        {actionType === "reject" && (
                                          <Button
                                            onClick={() => {
                                              if (!comments.trim()) {
                                                alert("Please provide a reason for rejection.");
                                                return;
                                              }
                                              handleChangeDecision();
                                            }}
                                            disabled={isProcessing}
                                            variant="destructive"
                                            className="flex-1"
                                          >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            {isProcessing ? "Processing..." : "Confirm Reject"}
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
