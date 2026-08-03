import React from "react";
import { useNavigate } from "react-router-dom";
import { SignUpPage } from "../components/ui/sign-in-flow-1.jsx";

export default function Signup() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Auth registration is performed inside SignUpPage. Simply redirect.
    navigate("/dashboard");
  };

  return <SignUpPage onSuccess={handleSuccess} />;
}
