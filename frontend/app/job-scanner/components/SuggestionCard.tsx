'use client';

import { Code, Star, Users, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type SuggestionItem = {
  text: string;
  action: 'add' | 'highlight' | 'suggest';
};

type SuggestionCardProps = {
  id: string;
  title: string;
  icon: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  items: SuggestionItem[];
  description: string;
};

const iconMap: Record<string, React.ReactNode> = {
  code: <Code className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  group: <Users className="h-5 w-5" />,
  format_align_left: <AlignLeft className="h-5 w-5" />,
};

const priorityColors = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-yellow-200 bg-yellow-50',
  low: 'border-blue-200 bg-blue-50',
};



export function SuggestionCard({ 
  id, 
  title, 
  icon, 
  category, // Used in the component's props but not directly in the JSX
  priority, 
  items, 
  description 
}: SuggestionCardProps) {
  return (
    <div 
      className={cn(
        'border rounded-lg p-4 transition-all hover:shadow-md',
        priorityColors[priority],
        `category-${category.toLowerCase().replace(/\s+/g, '-')}`
      )}
      data-category={category}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-white shadow-sm">
            {iconMap[icon] || <Code className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-800 border border-gray-300">
          {priority === 'high' ? 'High Priority' : priority === 'medium' ? 'Medium Priority' : 'Low Priority'}
        </span>
      </div>
      
      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Suggestions:</h4>
          <ul className="space-y-1">
            {items.map((item, index) => (
              <li key={`${id}-item-${index}`} className="flex items-start">
                <span className="mr-2">
                  {item.action === 'add' ? (
                    <PlusCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : item.action === 'highlight' ? (
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                  ) : (
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5" />
                  )}
                </span>
                <span className="text-sm text-gray-700">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Add missing icon components
function PlusCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function Lightbulb(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1 1.5 1.2 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}
