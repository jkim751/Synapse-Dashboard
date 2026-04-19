"use client";

const HOURS_12 = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINUTES = ["00", "15", "30", "45"];

function to12h(h24: number): { hour: string; period: "AM" | "PM" } {
  if (h24 === 0) return { hour: "12", period: "AM" };
  if (h24 < 12) return { hour: String(h24), period: "AM" };
  if (h24 === 12) return { hour: "12", period: "PM" };
  return { hour: String(h24 - 12), period: "PM" };
}

function to24h(hour: string, period: "AM" | "PM"): number {
  const h = parseInt(hour, 10);
  if (period === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function parse(value: string) {
  const date = value?.slice(0, 10) ?? "";
  const time = value?.slice(11, 16) ?? "09:00";
  const [hStr, mStr] = time.split(":");
  const h24 = parseInt(hStr ?? "9", 10);
  const min = MINUTES.includes(mStr) ? mStr : "00";
  const { hour, period } = to12h(h24);
  return { date, hour, min, period };
}

type Props = {
  value: string; // "YYYY-MM-DDTHH:MM"
  onChange: (value: string) => void;
  required?: boolean;
};

export default function DateTimeInput({ value, onChange, required }: Props) {
  const { date, hour, min, period } = parse(value);

  const emit = (d: string, h: string, m: string, p: "AM" | "PM") => {
    if (!d) { onChange(""); return; }
    const h24 = String(to24h(h, p)).padStart(2, "0");
    onChange(`${d}T${h24}:${m}`);
  };

  const selectClass = "ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm flex-1";

  return (
    <div className="flex flex-col gap-1 w-full">
      <input
        type="date"
        value={date}
        onChange={(e) => emit(e.target.value, hour, min, period as "AM" | "PM")}
        required={required}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
      />
      <div className="flex items-center gap-1">
        <select
          value={hour}
          onChange={(e) => emit(date, e.target.value, min, period as "AM" | "PM")}
          className={selectClass}
        >
          {HOURS_12.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-gray-400 font-medium text-sm">:</span>
        <select
          value={min}
          onChange={(e) => emit(date, hour, e.target.value, period as "AM" | "PM")}
          className={selectClass}
        >
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={period}
          onChange={(e) => emit(date, hour, min, e.target.value as "AM" | "PM")}
          className={selectClass}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}
