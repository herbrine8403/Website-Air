import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginPromptProps {
  trigger: ReactNode; // 触发元素（如按钮）
  message?: string;
}

export function LoginPrompt({ trigger, message = '此操作需要登录' }: LoginPromptProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const redirectToLogin = () => {
    const current = window.location.pathname + window.location.search;
    const redirect = encodeURIComponent(current);
    navigate(`/account/sign-in?redirect=${redirect}`);
  };

  return (
    <>
      <span onClick={handleClick} className="inline-flex">{trigger}</span>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">{message}</h3>
            <p className="text-sm text-muted-foreground mb-4">请先登录后再继续</p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-md text-sm hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 rounded-md bg-accent-blue text-white text-sm hover:opacity-90"
                onClick={redirectToLogin}
              >
                去登录
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LoginPrompt;
