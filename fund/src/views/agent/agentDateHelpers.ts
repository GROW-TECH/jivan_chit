function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalMonthStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function toLocalMonthLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function monthOptions(count = 6): string[] {
  const out: string[] = [];
  for (let offset = 0; offset < count; offset++) {
    out.push(toLocalMonthStr(new Date(new Date().getFullYear(), new Date().getMonth() - offset, 1)));
  }
  return out;
}