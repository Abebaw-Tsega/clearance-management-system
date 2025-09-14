import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LogOut,
  User,
  ChevronDown,
  Camera,
  Save,
  X,
} from "lucide-react";
import axios from "../lib/axios";

interface ProfileDropdownProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    profilePicture: `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=3b82f6&textColor=ffffff`,
  });
  const [extraInfo, setExtraInfo] = useState<any>({
    full_name: user.name, // Default to user.name until API data is fetched
    email: user.email,
    general_role: "",
    specific_role: "",
    phone: "",
  });

  useEffect(() => {
    // Fetch extra info based on role
    if (user.role === "student") {
      axios
        .get("/student/profile")
        .then((res) => {
          const data = res.data || {};
          setExtraInfo({
            full_name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || user.name,
            email: data.email || user.email,
            id_no: data.id_no || "",
            department_name: data.department_name || "",
            phone: data.phone || "",
          });
          console.log("Student profile data:", data); // Debug log
        })
        .catch((err) => {
          console.error("Student profile fetch error:", err);
          setExtraInfo({
            full_name: user.name,
            email: user.email,
            id_no: "",
            department_name: "",
            phone: "",
          });
        });
    } else if (user.role === "staff") {
      axios
        .get("/staff/profile")
        .then((res) => {
          const data = res.data || {};
          setExtraInfo({
            full_name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || user.name,
            email: data.email || user.email,
            general_role: data.general_role || "",
            specific_role: data.specific_role || "",
            phone: data.phone || "",
          });
          console.log("Staff profile data:", data); // Debug log
        })
        .catch((err) => {
          console.error("Staff profile fetch error:", err);
          setExtraInfo({
            full_name: user.name,
            email: user.email,
            general_role: "",
            specific_role: "",
            phone: "",
          });
        });
    } else if (user.role === "admin") {
      axios
        .get("/admin/profile")
        .then((res) => {
          const data = res.data || {};
          setExtraInfo({
            full_name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || user.name,
            email: data.email || user.email,
            general_role: data.general_role || "",
            specific_role: data.specific_role || "",
            phone: data.phone || "",
          });
          console.log("Admin profile data:", data); // Debug log
        })
        .catch((err) => {
          console.error("Admin profile fetch error:", err);
          setExtraInfo({
            full_name: user.name,
            email: user.email,
            general_role: "",
            specific_role: "",
            phone: "",
          });
        });
    } else if (user.role === "superadmin") {
      axios
        .get("/admin/profile") // Placeholder endpoint, adjust as needed
        .then((res) => {
          const data = res.data || {};
          setExtraInfo({
            full_name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || user.name,
            email: data.email || user.email,
            general_role: data.general_role || "",
            specific_role: data.specific_role || "",
            phone: data.phone || "",
          });
          console.log("Superadmin profile data:", data); // Debug log
        })
        .catch((err) => {
          console.error("Superadmin profile fetch error:", err);
          setExtraInfo({
            full_name: user.name,
            email: user.email,
            general_role: "",
            specific_role: "",
            phone: "",
          });
        });
    }
  }, [user.role, user.name, user.email]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-600";
      case "admin":
        return "bg-red-500";
      case "staff":
        return "bg-blue-500";
      case "student":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileData((prev) => ({
          ...prev,
          profilePicture: event.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateNewAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setProfileData((prev) => ({
      ...prev,
      profilePicture: `https://api.dicebear.com/7.x/initials/svg?seed=${randomSeed}&backgroundColor=3b82f6&textColor=ffffff`,
    }));
  };

  const handleSaveProfile = async () => {
    // Only validate if password is being changed
    if (profileData.newPassword.trim()) {
      if (!profileData.currentPassword.trim()) {
        alert("Please enter your current password to change it.");
        return;
      }
      if (profileData.newPassword !== profileData.confirmPassword) {
        alert("New passwords do not match.");
        return;
      }
      if (profileData.newPassword.length < 6) {
        alert("New password must be at least 6 characters long.");
        return;
      }
      // Update password in DB
      try {
        await axios.post("/change-password", {
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword,
          email: extraInfo.email || user.email,
        });
        alert("Password updated successfully!");
      } catch (err: any) {
        alert(err.response?.data?.error || "Failed to update password");
        return;
      }
    }
    // Save profile picture changes (if any)
    alert("Profile updated successfully!");
    setIsProfileOpen(false);
    setProfileData((prev) => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center space-x-3 hover:bg-gray-50 p-2 h-auto"
          >
            <div className="text-right hidden sm:block">
              <p className="font-medium text-gray-900 text-sm">{extraInfo.full_name}</p>
              <p className="text-xs text-gray-600 capitalize">{user.role}</p>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarImage src={profileData.profilePicture} alt={user.name} />
              <AvatarFallback className={`${getRoleColor(user.role)} text-white text-xs font-medium`}>
                {getInitials(extraInfo.full_name)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <div className="p-3 border-b">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={profileData.profilePicture} alt={user.name} />
                <AvatarFallback className={`${getRoleColor(user.role)} text-white font-medium`}>
                  {getInitials(extraInfo.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{extraInfo.full_name}</p>
                <p className="text-sm text-gray-600 truncate">{user.email}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1 ${getRoleColor(
                      user.role
                    )}`}
                  ></span>
                  {user.role}
                </p>
              </div>
            </div>
          </div>

          <div className="py-1">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                setIsProfileOpen(true);
                setIsOpen(false);
              }}
            >
              <User className="w-4 h-4 mr-2" />
              View Profile
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator />

          <div className="py-1">
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>View Profile</DialogTitle>
            <DialogDescription>
              View your profile information and update your photo or password if needed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Profile Picture Section - Editable */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Profile Picture</Label>
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profileData.profilePicture} alt={user.name} />
                  <AvatarFallback className={`${getRoleColor(user.role)} text-white text-lg font-medium`}>
                    {getInitials(extraInfo.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("picture-upload")?.click()}
                      className="flex items-center space-x-1"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Upload</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateNewAvatar}
                      className="flex items-center space-x-1"
                    >
                      <User className="w-4 h-4" />
                      <span>Generate</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Upload a photo or generate a new avatar
                  </p>
                </div>
                <input
                  id="picture-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                />
              </div>
            </div>

            {/* Basic Information - Read Only */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Basic Information</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">Full Name</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                    <span className="text-sm font-medium text-gray-900">
                      {extraInfo.full_name}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Email</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                    <span className="text-sm text-gray-900">{extraInfo.email}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Role</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(
                        user.role
                      )} text-white`}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                </div>
                {user.role === "student" && (
                  <>
                    <div>
                      <Label className="text-sm text-gray-600">Student ID</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                        <span className="text-sm text-gray-900">
                          {extraInfo.id_no || ""}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Department</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                        <span className="text-sm text-gray-900">
                          {extraInfo.department_name || ""}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Password Change - Editable */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Change Password</Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="current-password" className="text-sm">
                    Current Password
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={profileData.currentPassword}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    className="mt-1"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <Label htmlFor="new-password" className="text-sm">
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={profileData.newPassword}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    className="mt-1"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password" className="text-sm">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={profileData.confirmPassword}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="mt-1"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Leave password fields empty if you don't want to change your password
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsProfileOpen(false);
                // Reset password fields when closing
                setProfileData((prev) => ({
                  ...prev,
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                }));
              }}
              className="flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </Button>
            {(profileData.newPassword || profileData.currentPassword || profileData.confirmPassword) && (
              <Button
                onClick={handleSaveProfile}
                className="bg-aastu-blue hover:bg-aastu-blue/90 flex items-center space-x-1"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}