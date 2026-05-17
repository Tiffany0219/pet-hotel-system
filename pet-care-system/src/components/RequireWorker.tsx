import { Navigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";

const workerRoles = ["staff", "admin", "groomer", "caregiver"];

export default function RequireWorker({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!workerRoles.includes(user.role || "")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
