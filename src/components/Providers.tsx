"use client";

import React from 'react';
import ToastClient from './ToastClient';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastClient />
    </>
  );
}
