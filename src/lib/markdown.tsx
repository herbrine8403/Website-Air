import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  useEffect(() => {
    // 滚动到顶部时确保代码块可滚动
    document.querySelectorAll('pre code').forEach(el => {
      (el.parentElement as HTMLElement).style.overflowX = 'auto';
    });
  }, [content]);

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 禁用 raw HTML（XSS 防护）
          // 链接在新标签打开
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          img: ({ node, ...props }) => <img {...props} loading="lazy" />,
        }}
        skipHtml={true}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
