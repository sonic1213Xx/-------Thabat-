import type { ToastKind } from '@/components/toast-provider'

export const exportMessages = {
  loading: 'جاري التصدير...',
  success: 'تم التصدير بنجاح',
  error: 'حدث خطأ أثناء التصدير',
  pdf: 'تصدير PDF سيكون متاحاً قريباً',
}

export async function runExport<T>(task: () => T | Promise<T>, notify: (message: string, kind?: ToastKind) => number, update: (id: number, message: string, kind: ToastKind) => void): Promise<void> {
  const toastId = notify(exportMessages.loading, 'loading')
  try { await task(); update(toastId, exportMessages.success, 'success') } catch { update(toastId, exportMessages.error, 'error') }
}

export function notifyPdfComingSoon(notify: (message: string, kind?: ToastKind) => number): void {
  notify(exportMessages.pdf, 'info')
}
