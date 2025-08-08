'use client';

import { Code, Star, Users, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type SuggestionItem = {
  text: string;
  action: 'add' | 'highlight' | 'suggest';
};

type PriorityLevel = 'high' | 'medium' | 'low' | number;

type SuggestionCardProps = {
  id: string;
  title: string;
  icon: string;
  category: string;
  priority: PriorityLevel;
  items: SuggestionItem[];
  description: string;
};

const priorityColors = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-yellow-200 bg-yellow-50',
  low: 'border-blue-200 bg-blue-50',
};

const actionIcons = {
  add: <span className="text-red-500 mr-2">+</span>,
  highlight: <span className="text-yellow-500 mr-2">★</span>,
  suggest: <span className="text-blue-500 mr-2">💡</span>
};

const iconMap: Record<string, React.ReactNode> = {
  code: <Code className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  group: <Users className="h-5 w-5" />,
  format_align_left: <AlignLeft className="h-5 w-5" />,
};

export function SuggestionCard({ 
  id, 
  title, 
  icon, 
  category,
  priority, 
  items, 
  description 
}: SuggestionCardProps) {
  const t = useTranslations('jobScanner.suggestions');
  
  // Convert numeric priority to string if needed
  const getPriorityString = (priority: PriorityLevel): PriorityLevel => {
    if (typeof priority === 'number') {
      return priority === 1 ? 'high' : priority === 2 ? 'medium' : 'low';
    }
    return priority;
  };
  
  const priorityString = getPriorityString(priority);
  
  return (
    <div 
      className={cn(
        'h-full flex flex-col border rounded-xl p-5 transition-all hover:shadow-md',
        'bg-white',
        priorityColors[priorityString as 'high' | 'medium' | 'low'],
        `category-${category.toLowerCase().replace(/\s+/g, '-')}`,
        'flex flex-col justify-start'  // Ensure content starts from the top
      )}
      data-category={category}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'p-2 rounded-lg',
            priorityString === 'high' ? 'bg-red-100' :
            priorityString === 'medium' ? 'bg-yellow-100' :
            'bg-blue-100'
          )}>
            {iconMap[icon] || <Code className="h-5 w-5" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <span className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          priorityString === 'high' ? 'bg-red-100 text-red-800' :
          priorityString === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800',
          'shrink-0 ml-2'
        )}>
          {typeof priorityString === 'string' 
            ? priorityString.charAt(0).toUpperCase() + priorityString.slice(1)
            : priorityString === 1 ? 'High' : priorityString === 2 ? 'Medium' : 'Low'} 
        </span>
      </div>
      
      <p className="mb-4 text-sm text-gray-600">{description}</p>
      
      <div className="space-y-2 mt-3">
        {items.slice(0, 5).map((item, index) => (
          <div key={`${id}-${index}`} className="flex items-start group">
            {actionIcons[item.action]}
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              {item.text}
            </span>
          </div>
        ))}
        {items.length > 5 && (
          <div className="text-xs text-gray-500 mt-2">
            +{items.length - 5} {t('moreSuggestions')}
          </div>
        )}
      </div>
    </div>
  );
}
