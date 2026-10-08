'use client';

import React from 'react';
import { TrendingUp, BarChart2, Award, Users } from 'lucide-react';

interface SummaryCardItem {
  label: string;
  value: string | number;
}

interface ReportSummaryCardsProps {
  cards: SummaryCardItem[];
}

export function ReportSummaryCards({ cards }: ReportSummaryCardsProps) {
  if (!cards || cards.length === 0) return null;

  const icons = [TrendingUp, BarChart2, Award, Users];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = icons[index % icons.length];
        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {card.label}
              </p>
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {card.value}
              </h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
