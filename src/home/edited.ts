/** 'Your designs' edit time as on the mockup: 'Just now', '5 minutes ago', '2 hours ago', 'Yesterday', '12 Sep', '12 Sep 2025'. */
export function formatEdited(at: Date, now = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((day(now) - day(at)) / 86_400_000)
  if (days === 0) {
    const min = Math.floor((now.getTime() - at.getTime()) / 60_000)
    if (min < 1) return 'Just now'
    if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
    const h = Math.floor(min / 60)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  if (days === 1) return 'Yesterday'
  const date = `${at.getDate()} ${at.toLocaleDateString('en-US', { month: 'short' })}`
  return at.getFullYear() === now.getFullYear() ? date : `${date} ${at.getFullYear()}`
}
