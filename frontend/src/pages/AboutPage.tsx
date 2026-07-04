import React from 'react';
import { Wind } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FBFAFC]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-6">
            <Wind className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            The Silent Crisis: Air Quality, Health, and the Path Forward
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto leading-relaxed">
            Bridging the gap between complex air quality data and the people it affects.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-14">

        {/* Introduction */}
        <section>
          <p className="text-slate-700 text-lg leading-relaxed mb-4">
            Air pollution is one of the greatest environmental and public health challenges of our time, affecting billions of people worldwide. Although extensive air quality data are collected every day, understanding what these numbers mean and how they impact our lives remains a challenge for many. <strong>The Silent Crisis: Air Quality, Health, and the Path Forward</strong> was created to bridge this gap through interactive data storytelling.
          </p>
          <p className="text-slate-700 text-lg leading-relaxed mb-4">
            Our project transforms complex air quality data into an engaging and accessible experience. Through interactive maps, historical trends, pollutant exploration, and health-focused visualizations, users can investigate global air quality patterns, understand the six major pollutants monitored by international health agencies, and learn how air pollution affects both human health and the environment.
          </p>
          <p className="text-slate-700 text-lg leading-relaxed">
            Developed as part of the <strong>Visual Storytelling (VS) Team Project</strong>, this website demonstrates how interactive visualizations and thoughtful storytelling can make scientific data easier to explore, interpret, and understand.
          </p>
        </section>

        <hr className="border-[#CBD5E1]" />

        {/* Objectives */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Objectives</h2>
          <ul className="space-y-4">
            {[
              { label: 'Visualize', desc: 'global air quality data through interactive maps and charts.' },
              { label: 'Educate', desc: 'users about the six major air pollutants, their sources, and their health impacts.' },
              { label: 'Explore', desc: 'historical trends and regional differences in air quality.' },
              { label: 'Raise awareness', desc: 'about the importance of clean air and the need for informed environmental decisions.' },
              { label: 'Demonstrate', desc: 'how data storytelling can transform complex datasets into meaningful insights.' },
            ].map((item) => (
              <li key={item.label} className="flex gap-3 rounded-2xl bg-[#EEF3F8] px-5 py-4 text-slate-700 text-base">
                <span className="font-bold text-blue-700 shrink-0">{item.label}</span>
                <span>{item.desc}</span>
              </li>
            ))}
          </ul>
        </section>

        <hr className="border-[#CBD5E1]" />

        {/* Team */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Meet the Team</h2>
          <p className="text-slate-600 text-lg mb-6">
            This project was collaboratively designed and developed by:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {['Manasa Suresh Bhat', 'W. V. Subodhi Kalpani Wasalthilaka', 'Rajshekar Hiremath'].map((name) => (
              <div key={name} className="rounded-2xl border border-[#CBD5E1] bg-white px-6 py-5 text-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">{name[0]}</span>
                </div>
                <p className="font-semibold text-slate-900 text-base">{name}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-slate-600 text-base leading-relaxed">
            Together, we combined our expertise in data visualization, web development, and user experience design to create an engaging platform that communicates the global impact of air pollution through interactive storytelling.
          </p>
        </section>

        <hr className="border-[#CBD5E1]" />

        {/* Data Sources */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Data Sources</h2>
          <p className="text-slate-600 text-lg mb-5">
            The visualizations presented in this project are based on publicly available environmental datasets from trusted organizations, including:
          </p>
          <div className="flex flex-wrap gap-3">
            {['World Health Organization (WHO)', 'OpenAQ', 'World Air Quality Index (WAQI)', 'Other publicly available environmental monitoring datasets'].map((src) => (
              <span key={src} className="rounded-full bg-[#EEF3F8] border border-[#CBD5E1] px-4 py-2 text-sm font-semibold text-slate-700">
                {src}
              </span>
            ))}
          </div>
        </section>

        <hr className="border-[#CBD5E1]" />

        {/* Technologies */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Technologies Used</h2>
          <p className="text-slate-600 text-lg mb-5">
            This project was developed using modern web technologies, including:
          </p>
          <div className="flex flex-wrap gap-3">
            {['React', 'TypeScript', 'D3.js', 'Leaflet', 'JavaScript', 'HTML5 & CSS3', 'Tailwind CSS', 'Flask (Python)'].map((tech) => (
              <span key={tech} className="rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">
                {tech}
              </span>
            ))}
          </div>
        </section>

        <hr className="border-[#CBD5E1]" />

        {/* Vision */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Vision</h2>
          <blockquote className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-xl font-semibold leading-relaxed text-center shadow-lg">
            "Every breath matters. By making air quality data more accessible and understandable, we hope to inspire greater awareness of one of the world's most pressing environmental challenges and encourage informed conversations about creating a healthier, more sustainable future."
          </blockquote>
        </section>

      </div>
    </div>
  );
};

export default AboutPage;
