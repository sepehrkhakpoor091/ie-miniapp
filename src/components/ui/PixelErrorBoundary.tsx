/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Cozy Pixel Error Boundary with Auto-Recovery & Diagnostic View
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { PixelImage } from '../PixelImage';

interface PixelErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface PixelErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

export class PixelErrorBoundary extends Component<
  PixelErrorBoundaryProps,
  PixelErrorBoundaryState
> {
  constructor(props: PixelErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      errorStack: '',
    };
  }

  static getDerivedStateFromError(error: Error): PixelErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'خطای غیرمنتظره در اجرای برنامه',
      errorStack: error?.stack || '',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[PixelErrorBoundary] Caught runtime error:', error, errorInfo);
  }

  handleRecover = (): void => {
    try {
      if (this.props.onReset) {
        this.props.onReset();
      }
    } catch {
      // ignore callback error
    }
    this.setState({ hasError: false, errorMessage: '', errorStack: '' });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-5 bg-[#101622] text-[#F6F1E7] font-sans select-none text-right"
          dir="rtl"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#192334] border-2 border-[#D4AB58] p-6 text-center shadow-2xl space-y-4">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-[#101622] border border-[#2C3B54] flex items-center justify-center p-2">
              <PixelImage
                filename="07_char_laptop.png"
                alt="بازیابی سیستم"
                className="w-20 h-20 object-contain"
              />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#E77F6E]/20 text-[#E77F6E]">
                سپر محافظتی بدون خطا
              </span>
              <h2 className="text-lg font-black text-[#D4AB58]">
                وقفه کوتاه در پردازش صفحه!
              </h2>
              <p className="text-xs text-[#91B5BE] leading-relaxed">
                اطلاعات و امتیازات شما کاملاً محفوظ است. با زدن دکمه زیر بلافاصله به صفحه اصلی برگردید.
              </p>
            </div>

            {this.state.errorMessage && (
              <details className="text-right text-[10px] bg-black/35 border border-white/10 rounded-xl p-2.5 text-amber-300">
                <summary className="cursor-pointer font-bold select-text">
                  🔍 مشاهده جزئیات فنی خطا (Diagnostic)
                </summary>
                <div className="mt-1.5 font-mono break-all text-left opacity-90 select-text" dir="ltr">
                  {this.state.errorMessage}
                </div>
              </details>
            )}

            <button
              type="button"
              onClick={this.handleRecover}
              className="w-full py-3 px-4 rounded-2xl font-black text-sm bg-[#D4AB58] text-[#101622] border-b-4 border-[#9C7832] active:border-b-0 active:translate-y-1 transition-all cursor-pointer"
            >
              🔄 بازگشت به صفحه اصلی و پاکسازی خطا
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
