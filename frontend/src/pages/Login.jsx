import React from "react";
import { useNavigate } from "react-router-dom";
import { SignInPage } from "../components/ui/sign-in-flow-1.jsx";

export default function Login() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Auth is already performed inside SignInPage. Simply redirect.
    navigate("/dashboard");
  };

  return <SignInPage onSuccess={handleSuccess} />;
}
