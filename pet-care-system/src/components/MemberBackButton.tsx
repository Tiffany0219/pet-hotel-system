import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

type MemberBackButtonProps = {
  label?: string;
  fallback?: string;
  to?: string;
};

export default function MemberBackButton({
  label = "返回上一頁",
  fallback = "/dashboard",
  to,
}: MemberBackButtonProps) {
  const navigate = useNavigate();

  const goBack = () => {
    if (to) {
      navigate(to);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallback);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-2 rounded-full border border-[#eadfd8] bg-white px-4 py-2 text-sm text-[#6b3a2a] shadow-sm transition-all hover:bg-[#faf7f4]"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
