import React, { useEffect, useRef, useState } from 'react';
import { saveCustomUiTextsOnBot } from '../../utils/apiBridge';

interface VisualTextEditorOverlayProps {
  uiTexts: Record<string, string>;
  isVisualEditMode: boolean;
  adminTelegramId?: string;
  onUpdateUiTexts: (next: Record<string, string>) => void;
  onExitVisualEditMode: () => void;
}

const originalTextByNode = new WeakMap<Text, string>();

const IGNORED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'SVG',
  'PATH',
  'CIRCLE',
  'RECT',
  'POLYGON',
  'POLYLINE',
  'LINE',
  'CODE',
  'PRE',
]);

const SELECTABLE_TAGS = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'SPAN',
  'BUTTON',
  'LABEL',
  'A',
  'DIV',
  'LI',
]);

function isDynamicOrUnsafeText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 350) return true;
  // Must contain at least one Persian/Arabic letter
  if (!/[\u0600-\u06FF]/.test(trimmed)) return true;
  // Ignore dynamic tracking codes, signatures, student numbers, phone numbers, URLs
  if (/^(IE-|SIG-|http|www\.|09\d{9}|\d{8,12})/i.test(trimmed)) return true;
  if (/امتیاز:\s*[\d۰-۹]+|موجودی:\s*[\d۰-۹]+|رتبه\s*#?[\d۰-۹]+|ورودی\s*[\d۰-۹]{2,4}|شماره دانشجویی:\s*[\d۰-۹]+/i.test(trimmed)) {
    return true;
  }
  return false;
}

function isInsideIgnoredContainer(node: Node | null): boolean {
  let curr: Node | null = node;
  while (curr) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      const el = curr as HTMLElement;
      if (IGNORED_TAGS.has(el.tagName)) return true;
      if (el.getAttribute('data-visual-editor-ignore') === 'true') return true;
      if (el.getAttribute('data-dynamic-value') === 'true') return true;
    }
    curr = curr.parentNode;
  }
  return false;
}

export const VisualTextEditorOverlay: React.FC<VisualTextEditorOverlayProps> = ({
  uiTexts,
  isVisualEditMode,
  adminTelegramId,
  onUpdateUiTexts,
  onExitVisualEditMode,
}) => {
  const [editorMode, setEditorMode] = useState<'navigate' | 'select'>('select');
  const [hoveredEl, setHoveredEl] = useState<HTMLElement | null>(null);
  const [editingTarget, setEditingTarget] = useState<{
    originalKey: string;
    currentText: string;
    draftText: string;
  } | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const isApplyingRef = useRef(false);

  const showToast = (text: string, ok = true) => {
    setToastMessage({ text, ok });
    window.setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Global Safe CustomTextObserver: applies uiTexts dictionary to DOM Text nodes
  useEffect(() => {
    const rootEl = document.getElementById('root');
    if (!rootEl) return;

    const applyOverridesToTree = (container: Node) => {
      if (isApplyingRef.current) return;
      isApplyingRef.current = true;
      try {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let currentNode = walker.nextNode();
        while (currentNode) {
          const textNode = currentNode as Text;
          if (!isInsideIgnoredContainer(textNode)) {
            const rawVal = textNode.nodeValue || '';
            const trimmedVal = rawVal.trim();
            if (trimmedVal.length > 0) {
              let origTrimmed = originalTextByNode.get(textNode);
              if (!origTrimmed) {
                origTrimmed = trimmedVal;
                originalTextByNode.set(textNode, origTrimmed);
              } else {
                // If React updated this text node to something different from both origTrimmed and its override, refresh origTrimmed
                const prevOverride = uiTexts[origTrimmed];
                if (trimmedVal !== origTrimmed && trimmedVal !== prevOverride) {
                  // Check if trimmedVal is already one of the values in uiTexts
                  const matchingEntry = Object.entries(uiTexts).find(([, val]) => val === trimmedVal);
                  if (matchingEntry) {
                    origTrimmed = matchingEntry[0];
                  } else {
                    origTrimmed = trimmedVal;
                  }
                  originalTextByNode.set(textNode, origTrimmed);
                }
              }

              const targetOverride = uiTexts[origTrimmed];
              if (typeof targetOverride === 'string' && targetOverride.trim().length > 0) {
                if (trimmedVal !== targetOverride) {
                  const leadingSpace = rawVal.match(/^\s*/)?.[0] || '';
                  const trailingSpace = rawVal.match(/\s*$/)?.[0] || '';
                  textNode.nodeValue = `${leadingSpace}${targetOverride}${trailingSpace}`;
                }
              } else if (trimmedVal !== origTrimmed) {
                const leadingSpace = rawVal.match(/^\s*/)?.[0] || '';
                const trailingSpace = rawVal.match(/\s*$/)?.[0] || '';
                textNode.nodeValue = `${leadingSpace}${origTrimmed}${trailingSpace}`;
              }
            }
          }
          currentNode = walker.nextNode();
        }
      } finally {
        isApplyingRef.current = false;
      }
    };

    applyOverridesToTree(rootEl);

    const observer = new MutationObserver((mutations) => {
      if (isApplyingRef.current) return;
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (!isInsideIgnoredContainer(node)) {
              applyOverridesToTree(node);
            }
          });
        } else if (mutation.type === 'characterData' && mutation.target) {
          if (!isInsideIgnoredContainer(mutation.target)) {
            applyOverridesToTree(mutation.target);
          }
        }
      }
    });

    observer.observe(rootEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [uiTexts]);

  // Manage dashed outline on hovered element when in 'select' mode
  useEffect(() => {
    if (!isVisualEditMode || editorMode !== 'select') {
      if (hoveredEl) {
        hoveredEl.style.outline = '';
        hoveredEl.style.outlineOffset = '';
        setHoveredEl(null);
      }
      return;
    }

    const findEditableElement = (target: EventTarget | null): { el: HTMLElement; textNode: Text; originalKey: string; currentText: string } | null => {
      if (!(target instanceof HTMLElement)) return null;
      if (isInsideIgnoredContainer(target)) return null;

      let curr: HTMLElement | null = target;
      while (curr && curr !== document.body) {
        if (SELECTABLE_TAGS.has(curr.tagName) && !isInsideIgnoredContainer(curr)) {
          // Find a direct or primary text node with static Persian text
          const directTextNodes: Text[] = [];
          curr.childNodes.forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE && (child.nodeValue || '').trim().length > 1) {
              directTextNodes.push(child as Text);
            }
          });

          const candidateNode = directTextNodes[0];
          if (candidateNode) {
            const currentTrimmed = (candidateNode.nodeValue || '').trim();
            const originalKey = originalTextByNode.get(candidateNode) || currentTrimmed;
            if (!isDynamicOrUnsafeText(originalKey)) {
              return {
                el: curr,
                textNode: candidateNode,
                originalKey,
                currentText: currentTrimmed,
              };
            }
          }
        }
        curr = curr.parentElement;
      }
      return null;
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (editingTarget) return;
      const found = findEditableElement(e.target);
      if (found?.el !== hoveredEl) {
        if (hoveredEl) {
          hoveredEl.style.outline = '';
          hoveredEl.style.outlineOffset = '';
        }
        if (found?.el) {
          found.el.style.outline = '2px dashed #D4AB58';
          found.el.style.outlineOffset = '3px';
          setHoveredEl(found.el);
        } else {
          setHoveredEl(null);
        }
      }
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (editingTarget) return;
      if (e.target instanceof Node && isInsideIgnoredContainer(e.target)) {
        return;
      }
      const found = findEditableElement(e.target);
      if (!found) return;

      e.preventDefault();
      e.stopPropagation();

      if (hoveredEl) {
        hoveredEl.style.outline = '';
        hoveredEl.style.outlineOffset = '';
      }
      found.el.style.outline = '2px dashed #D4AB58';
      found.el.style.outlineOffset = '3px';
      setHoveredEl(found.el);

      setEditingTarget({
        originalKey: found.originalKey,
        currentText: found.currentText,
        draftText: found.currentText,
      });
    };

    window.addEventListener('mousemove', handlePointerMove, true);
    window.addEventListener('click', handleClickCapture, true);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove, true);
      window.removeEventListener('click', handleClickCapture, true);
      if (hoveredEl) {
        hoveredEl.style.outline = '';
        hoveredEl.style.outlineOffset = '';
      }
    };
  }, [isVisualEditMode, editorMode, hoveredEl, editingTarget]);

  if (!isVisualEditMode) {
    return null;
  }

  const handleSaveTextOverride = () => {
    if (!editingTarget) return;
    const trimmedDraft = editingTarget.draftText.trim();
    const next = { ...uiTexts };
    if (!trimmedDraft || trimmedDraft === editingTarget.originalKey) {
      delete next[editingTarget.originalKey];
    } else {
      next[editingTarget.originalKey] = trimmedDraft;
    }
    onUpdateUiTexts(next);
    setEditingTarget(null);
    showToast('✅ متن جدید اعمال شد. برای ثبت دائمی، دکمه ذخیره نهایی در سرور را بزنید.');
  };

  const handleRevertSingleText = () => {
    if (!editingTarget) return;
    const next = { ...uiTexts };
    delete next[editingTarget.originalKey];
    onUpdateUiTexts(next);
    setEditingTarget(null);
    showToast('🔄 متن به حالت پیش‌فرض بازگردانده شد.');
  };

  const handleSaveToCloudflare = async () => {
    setIsSavingCloud(true);
    try {
      const res = await saveCustomUiTextsOnBot(uiTexts, adminTelegramId);
      showToast(res.message, res.ok);
    } finally {
      setIsSavingCloud(false);
    }
  };

  const modifiedCount = Object.keys(uiTexts).length;

  return (
    <div data-visual-editor-ignore="true" dir="rtl">
      {/* Floating Editor Bar at Top of Screen */}
      <div className="fixed top-2 inset-x-2 z-[9999] bg-[#0B121E]/95 backdrop-blur-xl border-2 border-[#D4AB58]/70 rounded-2xl p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AB58] animate-pulse" />
              <span className="text-xs font-black text-[#D4AB58]">
                نوار ابزار ویرایشگر زنده مینی‌اپ ({modifiedCount} تغییر)
              </span>
            </div>
            <span className="text-[11px] font-bold text-gray-300">
              {editorMode === 'select'
                ? 'روی هر متن ثابت بزنید تا ویرایش شود'
                : 'جابه‌جایی آزاد بین تب‌ها و پنجره‌ها'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {/* Button 1: Mode Toggle */}
            <button
              type="button"
              onClick={() =>
                setEditorMode((prev) => (prev === 'select' ? 'navigate' : 'select'))
              }
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border ${
                editorMode === 'select'
                  ? 'bg-[#D4AB58] text-[#090F1A] border-[#D4AB58] shadow-md'
                  : 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
              }`}
            >
              {editorMode === 'select'
                ? '✏️ حالت انتخاب متن (فعال - تغییر به جابه‌جایی)'
                : '🚶‍♂️ حالت جابه‌جایی در اپ (فعال - تغییر به انتخاب متن)'}
            </button>

            {/* Button 2: Save to Cloudflare Server */}
            <button
              type="button"
              disabled={isSavingCloud}
              onClick={handleSaveToCloudflare}
              className="py-2 px-3 rounded-xl text-xs font-black bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSavingCloud
                ? '⏳ در حال ذخیره در کلودفلر...'
                : '💾 ذخیره نهایی در سرور کلودفلر'}
            </button>

            {/* Button 3: Exit and Return to Admin Panel */}
            <button
              type="button"
              onClick={onExitVisualEditMode}
              className="py-2 px-3 rounded-xl text-xs font-black bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all flex items-center justify-center gap-1.5"
            >
              🔙 خروج و بازگشت به پنل مدیریت
            </button>
          </div>
        </div>

        {toastMessage && (
          <div
            className={`mt-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
              toastMessage.ok
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            {toastMessage.text}
          </div>
        )}
      </div>

      {/* Compact Modal for Editing Selected Text */}
      {editingTarget && (
        <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0E1726] border-2 border-[#D4AB58]/60 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h4 className="text-sm font-black text-[#D4AB58]">
                ✏️ ویرایش زنده متن انتخاب‌شده
              </h4>
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold text-gray-400">متن فعلی (پیش‌فرض):</div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-300 leading-relaxed break-words">
                {editingTarget.originalKey}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#D4AB58] block">
                متن جدید را وارد کنید:
              </label>
              <textarea
                rows={3}
                value={editingTarget.draftText}
                onChange={(e) =>
                  setEditingTarget((prev) =>
                    prev ? { ...prev, draftText: e.target.value } : null
                  )
                }
                className="w-full rounded-xl bg-[#090F1A] border border-[#D4AB58]/50 p-2.5 text-xs text-white focus:outline-none focus:border-[#D4AB58] leading-relaxed"
                placeholder="متن جایگزین را بنویسید..."
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveTextOverride}
                className="flex-1 py-2.5 rounded-xl bg-[#D4AB58] hover:bg-[#e0ba6c] text-[#090F1A] text-xs font-black transition-all"
              >
                ✅ اعمال و ذخیره متن
              </button>
              {uiTexts[editingTarget.originalKey] && (
                <button
                  type="button"
                  onClick={handleRevertSingleText}
                  className="px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all"
                >
                  🔄 پیش‌فرض
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
