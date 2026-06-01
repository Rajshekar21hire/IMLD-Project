import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartProps {
  title: string;
  data: any[];
  dataKeys: { key: string; name: string; color: string }[];
  type: 'line' | 'bar';
}

export const Chart: React.FC<ChartProps> = ({ title, data, dataKeys, type }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {dataKeys.map((key) => (
              <Line
                key={key.key}
                type="monotone"
                dataKey={key.key}
                name={key.name}
                stroke={key.color}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {dataKeys.map((key) => (
              <Bar
                key={key.key}
                dataKey={key.key}
                name={key.name}
                fill={key.color}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
