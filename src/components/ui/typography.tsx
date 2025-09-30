import React from 'react';

export function TypographyH1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance md:text-5xl">
      {children}
    </h1>
  );
}

export function TypographyP({ children }: { children: React.ReactNode }) {
  return (
    <p className="leading-7 [&:not(:first-child)]:mt-6">
      {children}
    </p>
  )
}

// Add other typography components as needed