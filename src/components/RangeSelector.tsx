import { useData } from "@/state/DataContext";
import { Segmented } from "@/components/ui";

export function RangeSelector({ className }: { className?: string }) {
  const { rangeDays, setRangeDays } = useData();
  return (
    <Segmented
      ariaLabel="Select analysis period"
      className={className}
      value={rangeDays}
      onChange={setRangeDays}
      options={[
        { value: 1, label: "Today" },
        { value: 7, label: "7 days" },
        { value: 30, label: "30 days" },
      ]}
    />
  );
}

export function rangeLabel(days: number): string {
  if (days === 1) return "today";
  return `the last ${days} days`;
}
